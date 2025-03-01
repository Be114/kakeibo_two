import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';

function App() {
  // ステート変数を定義
  const [expenses, setExpenses] = useState({});
  const [dailyExpenses, setDailyExpenses] = useState([]); // 配列として初期化
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReflectModal, setShowReflectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedDailyExpense, setSelectedDailyExpense] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [showExpenseInput, setShowExpenseInput] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTemplateAmountInput, setShowTemplateAmountInput] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  
  // Firebase接続フラグ（本番環境ではtrueにする）
  const useFirebase = true;

  // 前月・翌月への移動関数
  const goToPrevMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = prev.month - 1;
      if (newMonth < 1) {
        return { year: prev.year - 1, month: 12 };
      }
      return { year: prev.year, month: newMonth };
    });
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = prev.month + 1;
      if (newMonth > 12) {
        return { year: prev.year + 1, month: 1 };
      }
      return { year: prev.year, month: newMonth };
    });
  };
  
  const formatSelectedMonth = () => {
    return `${currentMonth.year}年${currentMonth.month}月`;
  };

  // カテゴリIDを生成する関数（支出タイプに基づいて適切なIDを生成）
  const generateCategoryId = (category, split, owner) => {
    if (split) {
      return category;
    } else if (owner === 'me') {
      return `my_${category}`;
    } else if (owner === 'partner') {
      return `partner_${category}`;
    }
    return category;
  };

  // カテゴリIDを解析する関数（IDから支出タイプ情報を抽出）
  const parseCategoryId = (monthlyId) => {
    if (monthlyId.startsWith('my_')) {
      return {
        category: monthlyId.substring(3),
        split: false,
        owner: 'me'
      };
    } else if (monthlyId.startsWith('partner_')) {
      return {
        category: monthlyId.substring(8),
        split: false,
        owner: 'partner'
      };
    } else {
      return {
        category: monthlyId,
        split: true,
        owner: null
      };
    }
  };

  // Firestoreから月間支出データを取得する関数
  useEffect(() => {
    // Firestoreからデータを取得
    const fetchExpenses = async () => {
      if (!useFirebase) return;
      
      try {
        setLoading(true);
        console.log(`Fetching monthly expenses for ${currentMonth.year}/${currentMonth.month}...`);
        const expensesRef = collection(db, 'expenses');
        
        // 選択された月の文字列表現を作成
        const monthString = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}`;
        
        // 月文字列でクエリする
        const q = query(
          expensesRef, 
          where('monthString', '==', monthString)
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedExpenses = {};
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedExpenses[doc.id] = {
            ...data,
            _documentId: doc.id,
            id: doc.id,
            date: data.date?.toDate ? data.date.toDate() : new Date(data.date) || new Date(),
          };
        });
        
        console.log("Fetched monthly expenses:", fetchedExpenses);
        setExpenses(fetchedExpenses);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching expenses:", error);
        setLoading(false);
      }
    };
    
    fetchExpenses();
  }, [useFirebase, currentMonth]); // currentMonthが変更されたときに再取得

  // Firebase からデータを読み込む
  useEffect(() => {
    if (useFirebase) {
      const fetchData = async () => {
        try {
          setLoading(true);
          
          // 日別支出データを取得
          console.log(`Fetching daily expenses for ${currentMonth.year}/${currentMonth.month}...`);
          const dailyExpensesRef = collection(db, 'dailyExpenses');
          
          // 選択された月の文字列表現を作成
          const monthString = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}`;
          
          // 月文字列でクエリする
          const dailyQuery = query(
            dailyExpensesRef, 
            where('monthString', '==', monthString)
          );
          
          const dailySnapshot = await getDocs(dailyQuery);
          const fetchedDailyExpenses = [];
          
          dailySnapshot.forEach((doc) => {
            const data = doc.data();
            fetchedDailyExpenses.push({
              ...data,
              _documentId: doc.id,
              id: data.id || doc.id, // Firebase生成IDを使用
              date: data.date?.toDate ? data.date.toDate() : new Date(data.date) || new Date(),
            });
          });
          
          console.log("Fetched daily expenses:", fetchedDailyExpenses);
          setDailyExpenses(fetchedDailyExpenses);
          setLoading(false);
        } catch (error) {
          console.error("Error fetching data:", error);
          setLoading(false);
        }
      };
      
      fetchData();
    }
  }, [useFirebase, currentMonth]); // currentMonthが変更されたときに再取得
  
  // 月表示
  const getMonthDisplay = () => {
    return `${currentMonth.year}年 ${currentMonth.month}月`;
  };
  
  // テンプレート
  const templates = [
    { id: 'temp1', name: 'スーパー', category: 'grocery', icon: '🛒', split: true, type: 'variable' },
    { id: 'temp2', name: 'コンビニ', category: 'grocery', icon: '🏪', split: true, type: 'variable' },
    { id: 'temp3', name: '外食', category: 'dining', icon: '🍽️', split: true, type: 'variable' },
    { id: 'temp4', name: 'カフェ', category: 'dining', icon: '☕', split: false, owner: 'me', type: 'variable' },
    { id: 'temp5', name: '交通費', category: 'transport', icon: '🚃', split: false, owner: 'me', type: 'variable' },
    { id: 'temp6', name: '娯楽費', category: 'entertainment', icon: '🎮', split: true, type: 'variable' },
  ];
  
  // 費用の更新
  const updateExpense = async (id, amount) => {
    try {
      // Firebaseデータ更新処理
      const expenseRef = doc(db, 'expenses', id);
      await updateDoc(expenseRef, { amount });
      
      // ローカルデータを更新
      setExpenses(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          amount
        }
      }));
    } catch (error) {
      console.error("Error updating expense: ", error);
      alert("更新エラー: " + error.message);
    }
  };
  
  // 新しい支出を追加
  const addExpense = async (expenseData) => {
    try {
      // Firebaseへのデータ保存処理
      if (expenseData.date) {
        // 日別支出データに追加
        const dailyExpensesRef = collection(db, 'dailyExpenses');
        
        // 日付から月の文字列を作成
        const expenseDate = new Date(expenseData.date);
        const monthString = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
        
        // カスタムIDを生成せず、Firebaseが生成するIDを使用
        const newDocRef = await addDoc(dailyExpensesRef, {
          ...expenseData,
          monthString: monthString, // 月の文字列を追加
          timestamp: serverTimestamp() // タイムスタンプも追加（順序付けのため）
        });
        
        // Firebaseが生成したドキュメントIDを取得
        const newDocId = newDocRef.id;
        console.log("Firebase生成ID:", newDocId);
        
        // ドキュメントを更新して、id フィールドを Firebase ドキュメント ID と同じに設定
        await updateDoc(newDocRef, {
          id: newDocId,
          _documentId: newDocId // 明示的にドキュメントIDを保存
        });
        
        console.log("Firebase保存完了:", newDocId);
        
        // ローカルにも追加
        const newExpense = {
          ...expenseData,
          id: newDocId,
          _documentId: newDocId,
          monthString: monthString // 月の文字列を追加
        };
        
        setDailyExpenses(prev => [...prev, newExpense]);
        
        // 自動反映処理はコメントアウト
        // await handleAutoReflect(newExpense);
      }
      
      // テンプレートから追加された場合は、固定費/変動費データにも反映
      if (expenseData.fromTemplate) {
        const expenseRef = doc(db, 'expenses', expenseData.id);
        
        // 月の文字列を作成
        const currentMonthString = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}`;
        
        const expenseDoc = {
          id: expenseData.id,
          name: expenseData.name,
          amount: expenseData.amount,
          split: expenseData.split,
          owner: expenseData.split ? null : expenseData.owner,
          type: expenseData.type,
          icon: expenseData.icon,
          category: expenseData.category, // カテゴリ情報を追加
          monthString: currentMonthString, // 月の文字列を追加
          date: new Date(currentMonth.year, currentMonth.month - 1, 1) // 月の初日をデフォルト日付として設定
        };
        
        await setDoc(expenseRef, expenseDoc);
        
        // ローカルにも追加
        setExpenses(prev => ({
          ...prev,
          [expenseData.id]: expenseDoc
        }));
      }
      
      /*
      // Firebase がない場合のローカル処理
      // 日別支出データに追加
      if (expenseData.date) {
        const date = expenseData.date;
        setDailyExpenses(prev => ({
          ...prev,
          [date]: [...(prev[date] || []), {
            ...expenseData
          }]
        }));
      }
      
      // テンプレートから追加された場合は、固定費/変動費データにも反映
      if (expenseData.fromTemplate) {
        setExpenses(prev => ({
          ...prev,
          [expenseData.id]: {
            name: expenseData.name,
            amount: expenseData.amount,
            split: expenseData.split,
            owner: expenseData.split ? null : expenseData.owner,
            type: expenseData.type,
            icon: expenseData.icon
          }
        }));
      }
      */
      
      // モーダルを閉じる
      setShowExpenseInput(false);
      setShowTemplates(false);
      setShowTemplateAmountInput(false);
      
    } catch (error) {
      console.error("Error adding expense: ", error);
      alert("エラーが発生しました: " + error.message);
    }
  };
  
  // 日別支出を月間データに反映する関数
  const reflectDailyExpenseToMonthly = async (expense) => {
    try {
      console.log("日別支出を月間データに反映:", expense);
      
      if (!expense || !expense.category) {
        console.error("反映するデータが無効です:", expense);
        return { success: false, error: "無効なデータです" };
      }
      
      // カテゴリIDを生成（支出タイプに応じてプレフィックスを追加）
      const categoryId = generateCategoryId(expense.category, expense.split, expense.owner);
      console.log("生成されたカテゴリID:", categoryId);
      
      // データが既に反映済みの場合はスキップ
      if (expense.reflected) {
        console.log("このデータは既に反映済みです:", expense.id);
        
        // 反映済みだが monthlyId が異なる場合は警告を表示
        if (expense.monthlyId && expense.monthlyId !== categoryId) {
          console.warn("反映済みデータの monthlyId が一致しません:", {
            existingMonthlyId: expense.monthlyId,
            generatedCategoryId: categoryId
          });
        }
        
        // すでに反映済みなら成功扱いで返却
        return { success: true, categoryId: expense.monthlyId || categoryId };
      }
      
      // 日付から月の文字列を生成
      const expenseDate = expense.date instanceof Date ? expense.date : 
                         typeof expense.date === 'string' ? new Date(expense.date) : new Date();
      const monthString = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
      
      let monthlyData = null;
      
      // トランザクションを使用して、整合性を確保
      await runTransaction(db, async (transaction) => {
        // 月間データの参照を作成
        const monthlyRef = doc(db, 'expenses', categoryId);
        
        // 月間データの存在をチェック
        const monthlyDoc = await transaction.get(monthlyRef);
        
        if (monthlyDoc.exists()) {
          // 既存の月間データがある場合は更新
          console.log("既存の月間データを更新します:", categoryId);
          
          const existingData = monthlyDoc.data();
          const currentAmount = existingData.amount || 0;
          const newAmount = currentAmount + expense.amount;
          
          // 既存データのログ出力 (デバッグ用)
          console.log("既存の月間データ:", {
            id: existingData.id,
            category: existingData.category,
            amount: currentAmount,
            newAmount: newAmount
          });
          
          monthlyData = {
            ...existingData,
            amount: newAmount,
            category: expense.category,
            monthString: monthString, // 月の文字列を追加
            lastUpdated: new Date() // クライアント側で表示用
          };
          
          transaction.update(monthlyRef, {
            amount: newAmount,
            category: expense.category,
            monthString: monthString, // 月の文字列を追加
            lastUpdated: serverTimestamp()
          });
        } else {
          // 月間データが存在しない場合は新規作成
          console.log("新しい月間データを作成します:", categoryId);
          
          // 初期データを作成
          monthlyData = {
            id: categoryId,
            _documentId: categoryId,
            amount: expense.amount,
            name: expense.name || expense.category,
            category: expense.category,
            monthString: monthString, // 月の文字列を追加
            icon: expense.icon || "💰",
            split: expense.split || false,
            owner: expense.owner || null,
            type: expense.type || 'variable',
            date: expenseDate, // 日付も追加
            lastUpdated: new Date() // クライアント側で表示用
          };
          
          // 新規データをセット
          transaction.set(monthlyRef, {
            ...monthlyData,
            lastUpdated: serverTimestamp() // サーバー側のタイムスタンプ
          });
        }
      });
      
      // ローカルステートを更新
      if (monthlyData) {
        setExpenses(prev => ({
          ...prev,
          [categoryId]: monthlyData
        }));
      }
      
      // 日別支出データに月間IDと反映済みフラグを設定
      if (expense._documentId) {
        // 反映前に最新の状態を確認 (二重反映防止)
        const dailyRef = doc(db, 'dailyExpenses', expense._documentId);
        const currentDoc = await getDoc(dailyRef);
        
        if (currentDoc.exists()) {
          const currentData = currentDoc.data();
          
          // 既に別の処理で反映済みになっていないか確認
          if (currentData.reflected) {
            console.log("別の処理で既に反映済みになっています:", currentData);
            return { success: true, categoryId, monthlyData };
          }
          
          // 反映済みフラグと月間IDを設定
          await updateDoc(dailyRef, {
            monthlyId: categoryId,
            reflected: true
          });
          console.log("日別支出データを更新しました: monthlyId=", categoryId);
          
          // ローカルステートも更新
          setDailyExpenses(prev => {
            const newData = [...prev];
            const index = newData.findIndex(exp => exp.id === expense.id);
            if (index !== -1) {
              newData[index] = {
                ...newData[index],
                reflected: true,
                monthlyId: categoryId
              };
            }
            return newData;
          });
        } else {
          console.warn("日別支出データが見つかりません:", expense._documentId);
        }
      } else {
        console.warn("日別支出データに_documentIdがありません:", expense);
      }
      
      return { success: true, categoryId, monthlyData };
    } catch (error) {
      console.error("月間データへの反映エラー:", error);
      return { success: false, error: error.message };
    }
  };
  
  // 自動反映処理
  const handleAutoReflect = async (expense) => {
    console.log("自動反映処理は無効になっています");
    // 以下の処理はコメントアウトして実行しないようにしています
    /*
    try {
      if (!expense) return;
      
      console.log("反映対象データ:", expense);
      
      // すでに反映済みの場合はスキップ
      if (expense.reflected && expense.monthlyId) {
        console.log("すでに反映済みのため、スキップします:", expense.id);
        return;
      }
      
      // 日別支出データを月間データに反映
      await reflectDailyExpenseToMonthly(expense);
      
    } catch (error) {
      console.error("自動反映処理エラー:", error);
      alert("自動反映処理中にエラーが発生しました: " + error.message);
    }
    */
  };
  
  // 日別支出データを削除する関数
  const deleteDailyExpense = async (id) => {
    try {
      console.log(`日別支出データの削除を開始 (データID: ${id})`);
      setIsLoading(true);

      // 日別支出データを取得
      const dailyExpensesRef = collection(db, 'dailyExpenses');
      const dailyExpenseQuery = query(
        dailyExpensesRef,
        where('id', '==', id)
      );
      
      console.log(`クエリ作成: dailyExpenses where id=${id}`);
      const dailySnapshot = await getDocs(dailyExpenseQuery);
      
      if (dailySnapshot.empty) {
        console.warn(`削除対象の日別支出データが見つかりません (データID: ${id})`);
        setIsLoading(false);
        alert("削除対象の日別支出データが見つかりませんでした。");
        return;
      }
      
      console.log(`日別支出データが見つかりました: ${dailySnapshot.docs.length}件`);
      
      // 月間データの処理用にメインの日別支出データを取得
      const dailyDoc = dailySnapshot.docs[0];
      const dailyDocId = dailyDoc.id; // Firestoreのドキュメント ID
      const dailyData = dailyDoc.data();
      
      console.log(`削除対象のデータ詳細:`, {
        データID: dailyData.id,
        ドキュメントID: dailyDocId,
        カテゴリ: dailyData.category,
        金額: dailyData.amount,
        反映済み: dailyData.reflected ? 'はい' : 'いいえ',
        monthlyId: dailyData.monthlyId || 'なし',
        支出タイプ: dailyData.split ? '共同' : dailyData.owner === 'me' ? '自分' : 'パートナー'
      });

      // 月間データへの反映状況を確認して処理
      if (dailyData.reflected) {
        console.log("この日別支出データは月間データに反映済みです");
        
        // 月間データのIDを特定
        let monthlyId = null;
        
        if (dailyData.monthlyId) {
          // 明示的に保存されたmonthlyIdを使用（優先）
          monthlyId = dailyData.monthlyId;
          console.log(`保存されているmonthlyIdを使用: ${monthlyId}`);
        } else {
          // カテゴリと支出タイプから命名規則に基づいてIDを生成
          monthlyId = generateCategoryId(dailyData.category, dailyData.split, dailyData.owner);
          console.log(`命名規則に基づいてmonthlyIdを生成: ${monthlyId}`);
          console.log(`- カテゴリ: ${dailyData.category}`);
          console.log(`- 共同支出: ${dailyData.split ? 'はい' : 'いいえ'}`);
          console.log(`- オーナー: ${dailyData.owner || 'なし'}`);
        }
        
        try {
          // 月間データの取得
          const monthlyExpensesRef = collection(db, 'expenses');
          const monthlyDocRef = doc(monthlyExpensesRef, monthlyId); // ドキュメント参照を取得
          const monthlySnapshot = await getDoc(monthlyDocRef);
          
          if (monthlySnapshot.exists()) {
            const monthlyData = monthlySnapshot.data();
            console.log(`対応する月間データを発見:`, {
              月間ID: monthlyId,
              現在の金額: monthlyData.amount,
              カテゴリ: monthlyData.category
            });
            
            // 月間データから金額を差し引く
            let newAmount = (monthlyData.amount || 0) - (dailyData.amount || 0);
            if (newAmount < 0) newAmount = 0; // 負の値にならないように
            
            console.log(`月間データを更新 (ID: ${monthlyId}, 金額: ${monthlyData.amount} → ${newAmount})`);
            
            if (newAmount === 0) {
              // 金額が0になった場合は月間データを削除
              console.log(`月間データを削除します (金額が0): ${monthlyId}`);
              await deleteDoc(monthlyDocRef); // ドキュメント参照を使用
              
              // ローカルデータからも削除
              setExpenses((prev) => {
                const newExpenses = { ...prev };
                delete newExpenses[monthlyId];
                return newExpenses;
              });
              
              console.log(`月間データの削除完了: ${monthlyId}`);
            } else {
              // 金額が0でない場合は月間データを更新
              console.log(`月間データを更新します: ${monthlyId} (新金額: ${newAmount})`);
              await updateDoc(monthlyDocRef, { amount: newAmount }); // ドキュメント参照を使用
              
              // ローカルデータも更新
              setExpenses((prev) => {
                const newExpenses = { ...prev };
                if (newExpenses[monthlyId]) {
                  newExpenses[monthlyId] = {
                    ...newExpenses[monthlyId],
                    amount: newAmount
                  };
                }
                return newExpenses;
              });
              
              console.log(`月間データの更新完了: ${monthlyId} (新金額: ${newAmount})`);
            }
          } else {
            console.warn(`対応する月間データが見つかりません (月間ID: ${monthlyId})`);
          }
        } catch (error) {
          console.error(`月間データ更新エラー (月間ID: ${monthlyId}):`, error);
          alert(`月間データの更新中にエラーが発生しました: ${error.message}`);
        }
      } else {
        console.log("この日別支出データは月間データに反映されていません");
      }

      // 関連する全ての日別支出データを削除 (同じデータIDを持つ可能性のあるすべてのドキュメント)
      const allDailyDocsToDelete = dailySnapshot.docs;
      console.log(`削除対象の日別支出データ: ${allDailyDocsToDelete.length}件`);
      
      for (const docToDelete of allDailyDocsToDelete) {
        const docId = docToDelete.id;
        await deleteDoc(docToDelete.ref);
        console.log(`日別支出データを削除しました: ドキュメントID=${docId}, データID=${id}`);
      }
      
      // ローカルデータも更新
      setDailyExpenses(prev => prev.filter(exp => exp.id !== id));
      console.log(`ローカルステートから ${id} を削除しました`);
      
      setIsLoading(false);
      
      // 選択を解除
      setSelectedExpense(null);
      
      console.log("日別支出データの削除処理が完了しました");
      
    } catch (error) {
      setIsLoading(false);
      console.error("日別支出データ削除エラー:", error);
      alert(`日別支出データの削除中にエラーが発生しました: ${error.message}`);
    }
  };
  
  // 孤立したデータを整理する（monthlyIdがないが反映済みのデータを修復）
  const cleanupOrphanedData = async () => {
    try {
      console.log("孤立データの整理を開始");
      setIsLoading(true);
      let updatedCount = 0;
      
      // Firestoreから全ての日別支出データを取得
      const dailyExpensesRef = collection(db, 'dailyExpenses');
      const dailySnapshot = await getDocs(dailyExpensesRef);
      
      // 反映済みだがmonthlyIdが設定されていないデータを検出
      const updates = [];
      
      dailySnapshot.forEach(doc => {
        const expense = doc.data();
        if (expense.reflected && !expense.monthlyId && expense.category) {
          // ID生成
          const monthlyId = generateCategoryId(expense.category, expense.split, expense.owner);
          
          // 更新情報を追加
          updates.push({
            docRef: doc.ref,
            docId: doc.id,
            expenseId: expense.id,
            monthlyId: monthlyId
          });
        }
      });
      
      console.log(`${updates.length}件の孤立データを発見`);
      
      // 月間データが存在する場合のみ修復
      for (const update of updates) {
        try {
          // 対応する月間データの存在を確認
          const monthlySnapshot = await getDoc(doc(db, 'expenses', update.monthlyId));
          
          if (monthlySnapshot.exists()) {
            // monthlyIdを追加
            await updateDoc(update.docRef, { monthlyId: update.monthlyId });
            updatedCount++;
            console.log(`ID:${update.expenseId}のデータを修復 (monthlyId: ${update.monthlyId})`);
          } else {
            console.log(`ID:${update.expenseId}の修復をスキップ (対応する月間データが存在しない)`);
          }
        } catch (error) {
          console.error(`ID:${update.expenseId}の修復に失敗:`, error);
        }
      }
      
      setIsLoading(false);
      console.log(`孤立データの整理完了: ${updatedCount}件のデータを修復`);
      
      if (updatedCount > 0) {
        alert(`${updatedCount}件のデータを修復しました`);
      } else if (updates.length > 0) {
        alert(`${updates.length}件の孤立データを発見しましたが、修復できませんでした`);
      } else {
        alert('修復が必要なデータはありませんでした');
      }
      
      return { success: true, updatedCount };
    } catch (error) {
      setIsLoading(false);
      console.error("データ整理エラー:", error);
      alert("データ整理中にエラーが発生しました: " + error.message);
      return { success: false, error: error.message };
    }
  };

  // すべての月間データをクリーンアップする
  const cleanupAllMonthlyData = async () => {
    try {
      console.log("すべての月間データのクリーンアップを開始");
      
      // 確認ダイアログを表示
      setShowDeleteConfirmModal(true);
      setSelectedExpense({ 
        type: 'cleanup_monthly', 
        name: '孤立した月間データを削除',
        icon: '🧹'
      });
      
      return { success: false, pending: true };
    } catch (error) {
      console.error("月間データクリーンアップエラー:", error);
      alert("月間データのクリーンアップ中にエラーが発生しました: " + error.message);
      return { success: false, error };
    }
  };
  
  // 全ての月間データを削除する
  const deleteAllMonthlyData = async () => {
    try {
      console.log("全ての月間データの削除を開始");
      
      // 確認ダイアログを表示
      setShowDeleteConfirmModal(true);
      setSelectedExpense({ 
        type: 'all_monthly', 
        name: 'すべての月間データ',
        icon: '📊'
      });
      
      return { success: false, pending: true };
    } catch (error) {
      console.error("月間データ削除エラー:", error);
      alert("月間データの削除中にエラーが発生しました: " + error.message);
      return { success: false, error };
    }
  };
  
  // テンプレート選択時の処理
  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setShowTemplateAmountInput(true);
  };
  
  // テンプレート金額入力後の保存処理
  const handleTemplateAmountSave = (amount) => {
    const newExpense = {
      id: `expense_${Date.now()}`,
      name: selectedTemplate.name,
      category: selectedTemplate.category,
      amount: Number(amount),
      split: selectedTemplate.split,
      owner: selectedTemplate.split ? null : selectedTemplate.owner,
      type: selectedTemplate.type,
      icon: selectedTemplate.icon,
      date: new Date().toISOString().split('T')[0],
      fromTemplate: true
    };
    
    addExpense(newExpense);
    setSelectedTemplate(null);
    setShowTemplateAmountInput(false);
  };
  
  // 費用項目コンポーネント（カテゴリ集計版）
  const CategoryExpenseItem = ({ category, items }) => {
    // カテゴリごとの合計金額を計算
    const totalAmount = items.reduce((total, item) => total + item.amount, 0);
    // アイコンは最初のアイテムのアイコンを使用
    const icon = items[0]?.icon || '💰';
    
    return (
      <div className="flex justify-between items-center py-3 border-b border-gray-700">
        <div className="flex items-center">
          <span className="text-xl mr-3">{icon}</span>
          <span className="text-sm">{category}</span>
        </div>
        <span className="font-medium">¥{totalAmount.toLocaleString()}</span>
      </div>
    );
  };

  // 費用項目コンポーネント（詳細表示用）
  const ExpenseItem = ({ id, item, editable = true }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-700">
      <div className="flex items-center">
        <span className="text-xl mr-3">{item.icon}</span>
        <span className="text-sm">{item.name}</span>
      </div>
      <div className="flex items-center">
        {editable ? (
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-400">¥</span>
            <input
              type="number"
              value={item.amount}
              onChange={(e) => updateExpense(id, Number(e.target.value))}
              className="pl-8 pr-2 py-1 w-24 text-right bg-gray-800 border border-gray-700 rounded text-white"
            />
          </div>
        ) : (
          <span className="font-medium">¥{item.amount.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
  
  // 「自分」タブの内容
  const MyTabContent = () => {
    // 自分の共同費用負担分（固定費）
    const myJointFixedShare = Object.entries(expenses)
      .filter(([_, item]) => item.split && item.type === 'fixed')
      .reduce((total, [_, item]) => total + item.amount / 2, 0);
    
    // 自分の共同費用負担分（変動費）
    const myJointVariableShare = Object.entries(expenses)
      .filter(([_, item]) => item.split && item.type === 'variable')
      .reduce((total, [_, item]) => total + item.amount / 2, 0);
    
    // 自分の個人固定費
    const myFixedExpenses = Object.entries(expenses)
      .filter(([_, item]) => !item.split && item.owner === 'me' && item.type === 'fixed');
    
    const myFixedTotal = myFixedExpenses.reduce((total, [_, item]) => total + item.amount, 0);
    
    // 自分の個人変動費
    const myVariableExpenses = Object.entries(expenses)
      .filter(([_, item]) => !item.split && item.owner === 'me' && item.type === 'variable');
    
    const myVariableTotal = myVariableExpenses.reduce((total, [_, item]) => total + item.amount, 0);
    
    // カテゴリごとにグループ化
    const groupedFixedExpenses = {};
    const groupedVariableExpenses = {};
    
    // 個人固定費をカテゴリでグループ化
    myFixedExpenses.forEach(([_, item]) => {
      if (!groupedFixedExpenses[item.category]) {
        groupedFixedExpenses[item.category] = [];
      }
      groupedFixedExpenses[item.category].push(item);
    });
    
    // 個人変動費をカテゴリでグループ化
    myVariableExpenses.forEach(([_, item]) => {
      if (!groupedVariableExpenses[item.category]) {
        groupedVariableExpenses[item.category] = [];
      }
      groupedVariableExpenses[item.category].push(item);
    });
    
    // 総計
    const totalExpense = myJointFixedShare + myJointVariableShare + myFixedTotal + myVariableTotal;
    
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2 text-blue-400">共同固定費（自分の負担分）</h2>
          <div className="space-y-1">
            {Object.entries(expenses)
              .filter(([_, item]) => item.split && item.type === 'fixed')
              .map(([id, item]) => (
                <div key={id} className="flex justify-between items-center py-3 border-b border-gray-700">
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{item.icon}</span>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">(¥{item.amount.toLocaleString()} ÷ 2)</span>
                    <span className="font-medium">¥{(item.amount / 2).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            <div className="flex justify-between items-center py-3 border-t border-gray-600 mt-2">
              <span className="font-medium">小計</span>
              <span className="font-medium">¥{myJointFixedShare.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2 text-green-400">共同変動費（自分の負担分）</h2>
          <div className="space-y-1">
            {Object.entries(expenses)
              .filter(([_, item]) => item.split && item.type === 'variable')
              .map(([id, item]) => (
                <div key={id} className="flex justify-between items-center py-3 border-b border-gray-700">
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{item.icon}</span>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">(¥{item.amount.toLocaleString()} ÷ 2)</span>
                    <span className="font-medium">¥{(item.amount / 2).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            <div className="flex justify-between items-center py-3 border-t border-gray-600 mt-2">
              <span className="font-medium">小計</span>
              <span className="font-medium">¥{myJointVariableShare.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2 text-purple-400">個人固定費</h2>
          <div className="space-y-1">
            {Object.entries(groupedFixedExpenses).map(([category, items]) => (
              <CategoryExpenseItem key={category} category={category} items={items} />
            ))}
            <div className="flex justify-between items-center py-3 border-t border-gray-600 mt-2">
              <span className="font-medium">小計</span>
              <span className="font-medium">¥{myFixedTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2 text-yellow-400">個人変動費</h2>
          <div className="space-y-1">
            {Object.entries(groupedVariableExpenses).map(([category, items]) => (
              <CategoryExpenseItem key={category} category={category} items={items} />
            ))}
            <div className="flex justify-between items-center py-3 border-t border-gray-600 mt-2">
              <span className="font-medium">小計</span>
              <span className="font-medium">¥{myVariableTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2">自分の総支出</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>共同固定費負担分</span>
              <span>¥{myJointFixedShare.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>共同変動費負担分</span>
              <span>¥{myJointVariableShare.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>個人固定費</span>
              <span>¥{myFixedTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>個人変動費</span>
              <span>¥{myVariableTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-600">
              <span className="font-medium">総計</span>
              <span className="font-medium">¥{totalExpense.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 「パートナー」タブの内容
  const PartnerTabContent = () => {
    // パートナーの共同費用負担分（固定費）
    const partnerJointFixedShare = Object.entries(expenses)
      .filter(([_, item]) => item.split && item.type === 'fixed')
      .reduce((total, [_, item]) => total + item.amount / 2, 0);
    
    // パートナーの共同費用負担分（変動費）
    const partnerJointVariableShare = Object.entries(expenses)
      .filter(([_, item]) => item.split && item.type === 'variable')
      .reduce((total, [_, item]) => total + item.amount / 2, 0);
    
    // パートナーの個人固定費
    const partnerFixedExpenses = Object.entries(expenses)
      .filter(([_, item]) => !item.split && item.owner === 'partner' && item.type === 'fixed');
    
    const partnerFixedTotal = partnerFixedExpenses.reduce((total, [_, item]) => total + item.amount, 0);
    
    // パートナーの個人変動費
    const partnerVariableExpenses = Object.entries(expenses)
      .filter(([_, item]) => !item.split && item.owner === 'partner' && item.type === 'variable');
    
    const partnerVariableTotal = partnerVariableExpenses.reduce((total, [_, item]) => total + item.amount, 0);
    
    // カテゴリごとにグループ化
    const groupedFixedExpenses = {};
    const groupedVariableExpenses = {};
    
    // 個人固定費をカテゴリでグループ化
    partnerFixedExpenses.forEach(([_, item]) => {
      if (!groupedFixedExpenses[item.category]) {
        groupedFixedExpenses[item.category] = [];
      }
      groupedFixedExpenses[item.category].push(item);
    });
    
    // 個人変動費をカテゴリでグループ化
    partnerVariableExpenses.forEach(([_, item]) => {
      if (!groupedVariableExpenses[item.category]) {
        groupedVariableExpenses[item.category] = [];
      }
      groupedVariableExpenses[item.category].push(item);
    });
    
    // 総計
    const totalExpense = partnerJointFixedShare + partnerJointVariableShare + partnerFixedTotal + partnerVariableTotal;
    
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2 text-blue-400">共同固定費（パートナーの負担分）</h2>
          <div className="space-y-1">
            {Object.entries(expenses)
              .filter(([_, item]) => item.split && item.type === 'fixed')
              .map(([id, item]) => (
                <div key={id} className="flex justify-between items-center py-3 border-b border-gray-700">
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{item.icon}</span>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">(¥{item.amount.toLocaleString()} ÷ 2)</span>
                    <span className="font-medium">¥{(item.amount / 2).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            <div className="flex justify-between items-center py-3 border-t border-gray-600 mt-2">
              <span className="font-medium">小計</span>
              <span className="font-medium">¥{partnerJointFixedShare.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2 text-green-400">共同変動費（パートナーの負担分）</h2>
          <div className="space-y-1">
            {Object.entries(expenses)
              .filter(([_, item]) => item.split && item.type === 'variable')
              .map(([id, item]) => (
                <div key={id} className="flex justify-between items-center py-3 border-b border-gray-700">
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{item.icon}</span>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">(¥{item.amount.toLocaleString()} ÷ 2)</span>
                    <span className="font-medium">¥{(item.amount / 2).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            <div className="flex justify-between items-center py-3 border-t border-gray-600 mt-2">
              <span className="font-medium">小計</span>
              <span className="font-medium">¥{partnerJointVariableShare.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2 text-purple-400">個人固定費</h2>
          <div className="space-y-1">
            {Object.entries(groupedFixedExpenses).map(([category, items]) => (
              <CategoryExpenseItem key={category} category={category} items={items} />
            ))}
            <div className="flex justify-between items-center py-3 border-t border-gray-600 mt-2">
              <span className="font-medium">小計</span>
              <span className="font-medium">¥{partnerFixedTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2 text-yellow-400">個人変動費</h2>
          <div className="space-y-1">
            {Object.entries(groupedVariableExpenses).map(([category, items]) => (
              <CategoryExpenseItem key={category} category={category} items={items} />
            ))}
            <div className="flex justify-between items-center py-3 border-t border-gray-600 mt-2">
              <span className="font-medium">小計</span>
              <span className="font-medium">¥{partnerVariableTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2">パートナーの総支出</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>共同固定費負担分</span>
              <span>¥{partnerJointFixedShare.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>共同変動費負担分</span>
              <span>¥{partnerJointVariableShare.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>個人固定費</span>
              <span>¥{partnerFixedTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>個人変動費</span>
              <span>¥{partnerVariableTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-600">
              <span className="font-medium">総計</span>
              <span className="font-medium">¥{totalExpense.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 「共同」タブの内容
  const JointTabContent = () => {
    // 共同固定費
    const jointFixedExpenses = Object.entries(expenses)
      .filter(([_, item]) => item.split && item.type === 'fixed');
    
    const jointFixedTotal = jointFixedExpenses.reduce((total, [_, item]) => total + item.amount, 0);
    
    // 共同変動費
    const jointVariableExpenses = Object.entries(expenses)
      .filter(([_, item]) => item.split && item.type === 'variable');
    
    const jointVariableTotal = jointVariableExpenses.reduce((total, [_, item]) => total + item.amount, 0);
    
    // 自分の個人費用
    const myExpenses = Object.entries(expenses)
      .filter(([_, item]) => !item.split && item.owner === 'me');
    
    const myTotal = myExpenses.reduce((total, [_, item]) => total + item.amount, 0);
    
    // パートナーの個人費用
    const partnerExpenses = Object.entries(expenses)
      .filter(([_, item]) => !item.split && item.owner === 'partner');
    
    const partnerTotal = partnerExpenses.reduce((total, [_, item]) => total + item.amount, 0);
    
    // カテゴリごとにグループ化
    const groupedJointFixedExpenses = {};
    const groupedJointVariableExpenses = {};
    const groupedMyExpenses = {};
    const groupedPartnerExpenses = {};
    
    // 共同固定費をカテゴリでグループ化
    jointFixedExpenses.forEach(([_, item]) => {
      if (!groupedJointFixedExpenses[item.category]) {
        groupedJointFixedExpenses[item.category] = [];
      }
      groupedJointFixedExpenses[item.category].push(item);
    });
    
    // 共同変動費をカテゴリでグループ化
    jointVariableExpenses.forEach(([_, item]) => {
      if (!groupedJointVariableExpenses[item.category]) {
        groupedJointVariableExpenses[item.category] = [];
      }
      groupedJointVariableExpenses[item.category].push(item);
    });
    
    // 自分の個人費用をカテゴリでグループ化
    myExpenses.forEach(([_, item]) => {
      if (!groupedMyExpenses[item.category]) {
        groupedMyExpenses[item.category] = [];
      }
      groupedMyExpenses[item.category].push(item);
    });
    
    // パートナーの個人費用をカテゴリでグループ化
    partnerExpenses.forEach(([_, item]) => {
      if (!groupedPartnerExpenses[item.category]) {
        groupedPartnerExpenses[item.category] = [];
      }
      groupedPartnerExpenses[item.category].push(item);
    });
    
    // 総計
    const totalExpense = jointFixedTotal + jointVariableTotal + myTotal + partnerTotal;
    
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2 text-blue-400">共同固定費</h2>
          <div className="space-y-1">
            {Object.entries(groupedJointFixedExpenses).map(([category, items]) => (
              <CategoryExpenseItem key={category} category={category} items={items} />
            ))}
            <div className="flex justify-between items-center py-3 border-t border-gray-600 mt-2">
              <span className="font-medium">小計</span>
              <span className="font-medium">¥{jointFixedTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2 text-green-400">共同変動費</h2>
          <div className="space-y-1">
            {Object.entries(groupedJointVariableExpenses).map(([category, items]) => (
              <CategoryExpenseItem key={category} category={category} items={items} />
            ))}
            <div className="flex justify-between items-center py-3 border-t border-gray-600 mt-2">
              <span className="font-medium">小計</span>
              <span className="font-medium">¥{jointVariableTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2 text-purple-400">自分の個人費用</h2>
          <div className="space-y-1">
            {Object.entries(groupedMyExpenses).map(([category, items]) => (
              <CategoryExpenseItem key={category} category={category} items={items} />
            ))}
            <div className="flex justify-between items-center py-3 border-t border-gray-600 mt-2">
              <span className="font-medium">小計</span>
              <span className="font-medium">¥{myTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2 text-yellow-400">パートナーの個人費用</h2>
          <div className="space-y-1">
            {Object.entries(groupedPartnerExpenses).map(([category, items]) => (
              <CategoryExpenseItem key={category} category={category} items={items} />
            ))}
            <div className="flex justify-between items-center py-3 border-t border-gray-600 mt-2">
              <span className="font-medium">小計</span>
              <span className="font-medium">¥{partnerTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2">月間総計</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>共同固定費</span>
              <span>¥{jointFixedTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>共同変動費</span>
              <span>¥{jointVariableTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>自分の個人費用</span>
              <span>¥{myTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>パートナーの個人費用</span>
              <span>¥{partnerTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-600">
              <span className="font-medium">総計</span>
              <span className="font-medium">¥{totalExpense.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 「日別」タブの内容
  const DailyTabContent = () => {
    // 日別支出をグループ化
    const groupedExpenses = useMemo(() => {
      const groups = {};
      
      // 日別支出をループして日付ごとにグループ化
      dailyExpenses.forEach(expense => {
        if (!expense || !expense.date) return;
        
        // 日付のフォーマット（yyyy-mm-dd）
        let dateKey;
        if (typeof expense.date === 'string') {
          dateKey = expense.date;
        } else {
          dateKey = expense.date.toISOString().split('T')[0];
        }
        
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        
        groups[dateKey].push(expense);
      });
      
      // 日付でソート（新しい順）
      return Object.entries(groups)
        .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
        .map(([date, expenses]) => ({
          date,
          expenses,
          total: expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0)
        }));
    }, [dailyExpenses]);
    
    // 月間合計の計算
    const calculateMonthlyTotal = () => {
      let total = 0;
      
      dailyExpenses.forEach(expense => {
        if (!expense || !expense.date) return;
        
        // 選択した月のデータのみを集計
        const expenseDate = new Date(expense.date);
        const expenseYear = expenseDate.getFullYear();
        const expenseMonth = expenseDate.getMonth() + 1;
        
        if (expenseYear === currentMonth.year && expenseMonth === currentMonth.month) {
          total += Number(expense.amount || 0);
        }
      });
      
      return total;
    };
    
    const monthlyTotal = calculateMonthlyTotal();
    
    return (
      <div>
        {/* 月サマリー */}
        <div className="flex justify-between bg-gray-800 p-4 mb-4 rounded-lg">
          <div className="text-center">
            <div className="text-gray-400">収入</div>
            <div className="text-blue-500 font-medium">{0}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">支出</div>
            <div className="text-red-500 font-medium">{monthlyTotal.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">合計</div>
            <div className="font-medium">{(0 - monthlyTotal).toLocaleString()}</div>
          </div>
        </div>
        
        {/* 日別支出リスト */}
        {groupedExpenses.length > 0 ? (
          groupedExpenses.map((group) => (
            <div key={group.date} className="mb-4">
              {/* 日付ヘッダー */}
              <div className="flex justify-between items-center py-2 bg-gray-800 px-3">
                <div className="flex items-center">
                  <span className="text-xl font-bold mr-2">{new Date(group.date).getDate()}</span>
                  <span className={`text-sm py-1 px-2 rounded ${new Date(group.date).getDay() === 0 ? 'text-red-500' : new Date(group.date).getDay() === 6 ? 'text-blue-500' : ''}`}>{['日', '月', '火', '水', '木', '金', '土'][new Date(group.date).getDay()]}</span>
                  <span className="text-xs text-gray-400 ml-2">{group.date.split('-')[1]}/{group.date.split('-')[2]}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-bold text-red-500">
                    ¥ {group.total.toLocaleString()}
                  </span>
                </div>
              </div>
              
              {/* 費用リスト */}
              <div className="bg-gray-900">
                {group.expenses.map(expense => (
                  <div key={expense.id} className="flex justify-between items-center p-3 border-b border-gray-800">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">{expense.icon}</span>
                      <div>
                        <div className="font-medium">{expense.name}</div>
                        <div className="text-xs text-gray-400">
                          {expense.split ? '共同' : expense.owner === 'me' ? '自分' : 'パートナー'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-500">¥ {expense.amount.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">
                        {expense.type === 'fixed' ? '固定費' : '変動費'}
                      </div>
                      <div className="flex space-x-2">
                        {!expense.reflected && (
                          <button 
                            className="text-green-500 hover:text-green-700 text-sm"
                            onClick={() => {
                              setSelectedDailyExpense(expense);
                              reflectDailyExpenseToMonthly(expense);
                            }}
                          >
                            反映
                          </button>
                        )}
                        <button 
                          className="text-blue-500 hover:text-blue-700 text-sm"
                          onClick={() => {
                            setSelectedDailyExpense(expense);
                            console.log("選択した支出データ:", expense);
                            setShowDeleteConfirmModal(true);
                            setSelectedExpense({
                              type: 'daily_expense',
                              id: expense.id,
                              name: expense.name,
                              icon: expense.icon,
                              amount: expense.amount,
                              date: expense.date,
                              split: expense.split,
                              owner: expense.owner 
                            });
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            データがありません
          </div>
        )}
      </div>
    );
  };
  
  // 「月間」タブの内容
  const MonthlyTabContent = () => {
    // カテゴリごとにデータを集計
    const aggregateByCategory = () => {
      const categoryMap = new Map();
      
      // 現在選択中の月に該当する支出のみフィルタリング
      const filteredExpenses = Object.values(expenses).filter(expense => {
        if (!expense.date) return false;
        
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === currentMonth.year && 
               expenseDate.getMonth() + 1 === currentMonth.month;
      });
      
      // すべての月間支出データをループ
      filteredExpenses.forEach(expense => {
        if (!expense.category) return;
        
        // データの種類に応じたキーを生成
        let displayKey;
        if (expense.split) {
          displayKey = `共同_${expense.category}`;
        } else if (expense.owner === 'me') {
          displayKey = `自分_${expense.category}`;
        } else if (expense.owner === 'partner') {
          displayKey = `パートナー_${expense.category}`;
        } else {
          displayKey = `その他_${expense.category}`;
        }
        
        // カテゴリデータの取得または新規作成
        if (!categoryMap.has(displayKey)) {
          categoryMap.set(displayKey, {
            key: displayKey,
            category: expense.category,
            ownerType: displayKey.split('_')[0],
            icon: expense.icon || '💰',
            amount: 0
          });
        }
        
        // 金額を加算
        const item = categoryMap.get(displayKey);
        item.amount += Number(expense.amount || 0);
      });
      
      // Mapからリストに変換して金額で降順ソート
      return Array.from(categoryMap.values())
        .sort((a, b) => b.amount - a.amount);
    };
    
    const categoryItems = aggregateByCategory();
    
    return (
      <div className="mt-4">
        <div className="bg-gray-800 p-4 mb-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">
            カテゴリ別支出 ({formatSelectedMonth()})
          </h2>
          <p className="text-gray-600 text-sm">
            同一カテゴリの支出は集計されています
          </p>
        </div>
        
        {/* カテゴリ別集計リスト */}
        <div className="space-y-4">
          {categoryItems.length > 0 ? (
            categoryItems.map((item) => (
              <CategoryExpenseItem key={item.key} category={item.category} items={Object.values(expenses).filter(expense => expense.category === item.category)} />
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              データがありません
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // 金額入力コンポーネント
  const AmountInput = ({ onSave, onCancel }) => {
    const [amount, setAmount] = useState('');
    
    // よく使う金額
    const quickAmounts = [100, 500, 1000, 2000, 3000, 5000];
    
    const handleSave = () => {
      if (!amount) {
        alert('金額を入力してください');
        return;
      }
      
      onSave(amount);
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg w-full max-w-md">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-2xl mr-3">{selectedTemplate?.icon}</span>
              <h3 className="text-lg font-medium">{selectedTemplate?.name}</h3>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-300"
            >
              ×
            </button>
          </div>
          
          <div className="p-4">
            <div className="mb-4">
              <div className="text-gray-400 mb-1">金額</div>
              <div className="bg-gray-900 p-3 rounded-lg text-right text-xl">
                ¥ {amount ? Number(amount).toLocaleString() : ''}
              </div>
            </div>
            
            <div className="mb-4">
              <div className="text-gray-400 mb-2">よく使う金額</div>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((amt, index) => (
                  <button
                    key={index}
                    onClick={() => setAmount(amt.toString())}
                    className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 text-left flex items-center"
                  >
                    ¥{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setAmount(amount + '7')} className="bg-gray-700 p-3">7</button>
                <button onClick={() => setAmount(amount + '8')} className="bg-gray-700 p-3">8</button>
                <button onClick={() => setAmount(amount + '9')} className="bg-gray-700 p-3">9</button>
                <button onClick={() => setAmount(amount + '4')} className="bg-gray-700 p-3">4</button>
                <button onClick={() => setAmount(amount + '5')} className="bg-gray-700 p-3">5</button>
                <button onClick={() => setAmount(amount + '6')} className="bg-gray-700 p-3">6</button>
                <button onClick={() => setAmount(amount + '1')} className="bg-gray-700 p-3">1</button>
                <button onClick={() => setAmount(amount + '2')} className="bg-gray-700 p-3">2</button>
                <button onClick={() => setAmount(amount + '3')} className="bg-gray-700 p-3">3</button>
                <button onClick={() => setAmount(amount + '00')} className="bg-gray-700 p-3">00</button>
                <button onClick={() => setAmount(amount + '0')} className="bg-gray-700 p-3">0</button>
                <button 
                  onClick={() => setAmount(amount.slice(0, -1))}
                  className="bg-gray-700 p-3"
                >
                  ⌫
                </button>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={onCancel} 
                className="flex-1 border border-gray-600 py-3 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-red-500 py-3 rounded-lg font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // テンプレート選択モーダル
  const TemplateSelector = () => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium">よく使う項目</h3>
          <button
            onClick={() => setShowTemplates(false)}
            className="text-gray-400 hover:text-gray-300"
          >
            ×
          </button>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 text-left flex items-center"
              >
                <span className="text-2xl mr-3">{template.icon}</span>
                <div>
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-gray-400">
                    {template.split ? '共同' : template.owner === 'me' ? '自分' : 'パートナー'} • 
                    {template.type === 'fixed' ? '固定費' : '変動費'}
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => {
              setShowTemplates(false);
              setShowExpenseInput(true);
            }}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg mt-4"
          >
            詳細入力に切り替え
          </button>
        </div>
      </div>
    </div>
  );
  
  // 詳細入力モーダル
  const ExpenseInputModal = () => {
    const [formData, setFormData] = useState({
      date: new Date().toISOString().split('T')[0],
      category: '',
      name: '',
      amount: '',
      split: true,
      owner: 'me',
      type: 'variable',
      memo: ''
    });
    
    // カテゴリ一覧
    const categories = {
      food: { name: '食費', icon: '🍚' },
      grocery: { name: '買い物', icon: '🛒' },
      dining: { name: '外食', icon: '🍽️' },
      transport: { name: '交通費', icon: '🚃' },
      entertainment: { name: '娯楽費', icon: '🎮' },
      daily: { name: '日用品', icon: '🧴' },
      utility: { name: '水道光熱費', icon: '💡' },
      communication: { name: '通信費', icon: '📱' },
      other: { name: 'その他', icon: '📦' }
    };
    
    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    };
    
    const handleSubmit = (e) => {
      e.preventDefault();
      
      if (!formData.amount || !formData.category || !formData.name) {
        alert('必須項目を入力してください');
        return;
      }
      
      const newExpense = {
        id: `expense_${Date.now()}`,
        date: formData.date,
        category: formData.category,
        name: formData.name,
        amount: Number(formData.amount),
        split: formData.split,
        owner: formData.split ? null : formData.owner,
        type: formData.type,
        icon: categories[formData.category]?.icon || '📦',
        memo: formData.memo
      };
      
      addExpense(newExpense);
      setShowExpenseInput(false);
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-gray-800 rounded-lg w-full max-w-md">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium">支出を追加</h3>
            <button
              onClick={() => setShowExpenseInput(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-gray-400 mb-1">日付</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded p-2"
              />
            </div>
            
            <div>
              <label className="block text-gray-400 mb-1">カテゴリ</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded p-2"
                required
              >
                <option value="" disabled>選択してください</option>
                {Object.entries(categories).map(([key, { name, icon }]) => (
                  <option key={key} value={key}>{icon} {name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-400 mb-1">項目名</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="例：コンビニ、ランチなど"
                className="w-full bg-gray-700 border border-gray-600 rounded p-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-400 mb-1">金額</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-400">¥</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2 pl-7"
                  required
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-gray-400 mb-1">費用タイプ</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2"
                >
                  <option value="variable">変動費</option>
                  <option value="fixed">固定費</option>
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-gray-400 mb-1">負担区分</label>
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, split: true }))}
                    className={`flex-1 py-2 ${formData.split ? 'bg-green-600' : 'bg-gray-700'} rounded-l`}
                  >
                    共同
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, split: false }))}
                    className={`flex-1 py-2 ${!formData.split ? 'bg-blue-600' : 'bg-gray-700'} rounded-r`}
                  >
                    個人
                  </button>
                </div>
              </div>
            </div>
            
            {!formData.split && (
              <div>
                <label className="block text-gray-400 mb-1">支払者</label>
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, owner: 'me' }))}
                    className={`flex-1 py-2 ${formData.owner === 'me' ? 'bg-blue-600' : 'bg-gray-700'} rounded-l`}
                  >
                    自分
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, owner: 'partner' }))}
                    className={`flex-1 py-2 ${formData.owner === 'partner' ? 'bg-purple-600' : 'bg-gray-700'} rounded-r`}
                  >
                    パートナー
                  </button>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-gray-400 mb-1">メモ（任意）</label>
              <textarea
                name="memo"
                value={formData.memo}
                onChange={handleChange}
                placeholder="メモを入力..."
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 h-20"
              ></textarea>
            </div>
            
            <div className="flex space-x-2 pt-4">
              <button 
                type="button"
                onClick={() => setShowExpenseInput(false)} 
                className="flex-1 border border-gray-600 py-3 rounded-lg"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 bg-red-500 py-3 rounded-lg font-medium"
              >
                保存
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  // 削除確認モーダル
  const DeleteConfirmModal = ({ show, onHide, displayData, onDelete }) => {
    // アイコンとタイトルを動的に設定
    const getIcon = () => {
      if (!displayData) return '❓';
      if (displayData.icon) return displayData.icon;
      
      // 削除タイプに基づいたデフォルトのアイコン
      switch (displayData.type) {
        case 'daily':
          return '📝';
        case 'monthly':
          return '📊';
        case 'all_monthly':
          return '📊';
        case 'cleanup_monthly':
          return '🧹';
        default:
          return '❓';
      }
    };

    const getTitle = () => {
      if (!displayData) return '削除の確認';
      
      // 削除タイプに基づいたタイトル
      switch (displayData.type) {
        case 'daily':
          return '日別支出データ削除の確認';
        case 'monthly':
          return '月間データ削除の確認';
        case 'all_monthly':
          return 'すべての月間データ削除の確認';
        case 'cleanup_monthly':
          return '孤立した月間データ削除の確認';
        default:
          return '削除の確認';
      }
    };

    const handleDelete = async () => {
      if (!displayData) return;
      
      try {
        if (displayData.type === 'all_monthly') {
          // すべての月間データを削除
          console.log("すべての月間データの削除を開始");
          setIsLoading(true);
          
          // すべての月間データを取得
          const monthlyExpensesRef = collection(db, 'expenses');
          const monthlySnapshot = await getDocs(monthlyExpensesRef);
          
          let deletedCount = 0;
          
          // すべての月間データを削除
          for (const doc of monthlySnapshot.docs) {
            try {
              await deleteDoc(doc.ref);
              deletedCount++;
              console.log(`月間データを削除: ${doc.id}`);
            } catch (error) {
              console.error(`月間データ削除エラー (${doc.id}):`, error);
            }
          }
          
          // ローカルデータも初期化
          setExpenses({});
          
          setIsLoading(false);
          
          if (deletedCount > 0) {
            console.log(`${deletedCount}件の月間データを削除しました`);
            alert(`${deletedCount}件の月間データを削除しました`);
          } else {
            alert('月間データはありませんでした');
          }
        } else if (displayData.type === 'cleanup_monthly') {
          // 孤立した月間データを削除
          console.log("孤立した月間データの削除を開始");
          setIsLoading(true);
          let deletedCount = 0;
          
          // すべての月間データを取得
          const monthlyExpensesRef = collection(db, 'expenses');
          const monthlySnapshot = await getDocs(monthlyExpensesRef);
          
          // 孤立した月間データを削除
          for (const doc of monthlySnapshot.docs) {
            const docData = doc.data();
            if (!docData.category) {
              try {
                await deleteDoc(doc.ref);
                deletedCount++;
                console.log(`孤立した月間データを削除: ${doc.id}`);
              } catch (error) {
                console.error(`孤立した月間データ削除エラー (${doc.id}):`, error);
              }
            }
          }
          
          // ローカルデータも更新
          setExpenses(prev => {
            const newData = { ...prev };
            for (const id in newData) {
              if (!newData[id].category) {
                delete newData[id];
              }
            }
            return newData;
          });
          
          setIsLoading(false);
          
          if (deletedCount > 0) {
            console.log(`${deletedCount}件の孤立した月間データを削除しました`);
            alert(`${deletedCount}件の孤立した月間データを削除しました`);
          } else {
            alert('孤立した月間データはありませんでした');
          }
        } else {
          // 単一の支出データを削除
          await deleteDailyExpense(displayData.id);
        }
        
        // モーダルを閉じる
        setShowDeleteConfirmModal(false);
      } catch (error) {
        setIsLoading(false);
        console.error("削除処理エラー:", error);
        alert(`削除処理中にエラーが発生しました: ${error.message}`);
      }
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg max-w-md w-full">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4 text-center">{getTitle()}</h2>
            
            {displayData && (
              <div className="text-center mb-6">
                <div className="text-gray-400 mb-2">以下の支出を削除します：</div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-3">{getIcon()}</span>
                    <div className="font-medium">{displayData.name || '不明なデータ'}</div>
                  </div>
                  
                  {displayData.amount !== undefined && (
                    <div className="flex justify-between text-sm mb-2">
                      <div>金額:</div>
                      <div className="font-medium">¥{displayData.amount.toLocaleString()}</div>
                    </div>
                  )}
                  
                  {displayData.type && (
                    <div className="flex justify-between text-sm mb-2">
                      <div>タイプ:</div>
                      <div>{displayData.type === 'fixed' ? '固定費' : displayData.type === 'all_monthly' ? '全ての月間データ' : '変動費'}</div>
                    </div>
                  )}
                  
                  {(displayData.split !== undefined || displayData.owner) && (
                    <div className="flex justify-between text-sm">
                      <div>負担区分:</div>
                      <div>{displayData.split ? '共同' : displayData.owner === 'me' ? '自分' : 'パートナー'}</div>
                    </div>
                  )}
                  
                  {displayData.id && (
                    <div className="flex justify-between text-sm mt-2">
                      <div>ID:</div>
                      <div className="text-xs text-gray-400">{displayData.id}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="text-center text-red-500 mb-6">
              この操作は元に戻せません。本当に削除しますか？
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-l"
                onClick={() => onHide()}
              >
                キャンセル
              </button>
              <button
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-r"
                onClick={handleDelete}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 設定画面
  const SettingsView = () => {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h2 className="text-2xl font-bold mb-6">設定</h2>
        
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="text-lg font-semibold mb-3">データの整理と修復</h3>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 mb-2">
                日別データの整理：反映済みデータにmonthlyIdを設定します
              </p>
              <button 
                onClick={cleanupOrphanedData}
                className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    処理中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    日別データの修復
                  </>
                )}
              </button>
            </div>
            
            <div>
              <p className="text-gray-600 mb-2">
                古いデータ形式の修復：monthStringフィールドを追加します
              </p>
              <button 
                onClick={repairOldDataFormat}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    処理中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v2m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
                    </svg>
                    古いデータ形式の修復
                  </>
                )}
              </button>
            </div>
            
            <div>
              <p className="text-gray-600 mb-2">
                月間データのクリーンアップ：孤立した月間データを削除します
              </p>
              <button 
                onClick={cleanupAllMonthlyData}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    処理中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                    </svg>
                    月間データのクリーンアップ
                  </>
                )}
              </button>
            </div>
            
            <div>
              <p className="text-gray-600 mb-2">
                危険：すべての月間データを削除します（元に戻せません）
              </p>
              <button 
                onClick={deleteAllMonthlyData}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    処理中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    月間データの完全削除
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">アプリについて</h3>
          <p className="text-gray-600">
            家計簿アプリ（Kakeibo Two）バージョン 1.0.0
          </p>
        </div>
      </div>
    );
  };

  // 反映処理
  const handleReflect = async () => {
    if (!selectedDailyExpense) return;
    
    setIsLoading(true);
    
    try {
      console.log("反映処理を開始:", selectedDailyExpense);
      
      const result = await reflectDailyExpenseToMonthly(selectedDailyExpense);
      
      if (result.success) {
        console.log("反映処理成功:", result.categoryId);
        setShowReflectModal(false);
        setSelectedDailyExpense(null);
        alert('月間データに反映しました');
      } else {
        console.error("反映処理失敗:", result.error);
        alert(`反映処理中にエラーが発生しました: ${result.error}`);
      }
    } catch (error) {
      console.error("反映処理エラー:", error);
      alert(`反映処理中にエラーが発生しました: ${error.message}`);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 選択した日別支出を月間データに反映する
  const reflectSelectedExpense = async (expense) => {
    console.log("手動反映ボタンが押されました（反映処理は無効化中）");
    alert("反映機能は現在無効化されています。");
    
    /*
    try {
      if (!expense) return;
      
      console.log("反映対象データ:", expense);
      
      // すでに反映済みの場合は確認
      if (expense.reflected && expense.monthlyId) {
        const confirmReflect = window.confirm("このデータは既に反映済みです。再度反映しますか？");
        if (!confirmReflect) return;
      }
      
      setIsLoading(true);
      
      // 月間データに反映
      const result = await reflectDailyExpenseToMonthly(expense);
      
      if (result.success) {
        // 日別支出データのreflectedフラグとmonthlyIdを更新
        if (expense._documentId) {
          const dailyRef = doc(db, 'dailyExpenses', expense._documentId);
          await updateDoc(dailyRef, {
            reflected: true,
            monthlyId: result.categoryId
          });
          
          // ローカルステートも更新
          setDailyExpenses(prev => {
            const newData = [...prev];
            const index = newData.findIndex(exp => exp.id === expense.id);
            if (index !== -1) {
              newData[index] = {
                ...newData[index],
                reflected: true,
                monthlyId: result.categoryId
              };
            }
            return newData;
          });
          
          alert("反映が完了しました");
        } else {
          console.error("日別支出データに_documentIdがありません:", expense);
          alert("反映処理に失敗しました: データIDがありません");
        }
      } else {
        alert("反映処理に失敗しました: " + (result.error || "不明なエラー"));
      }
      
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error("反映処理エラー:", error);
      alert("反映処理中にエラーが発生しました: " + error.message);
    }
    */
  };
  
  // ローディング表示
  if (loading) {
    return (
      <div className="bg-gray-900 text-white min-h-screen flex justify-center items-center">
        <p className="text-xl">データを読み込み中...</p>
      </div>
    );
  }
  
  // 古いデータ形式を修復する（monthStringを追加）
  const repairOldDataFormat = async () => {
    try {
      console.log("古いデータ形式の修復を開始");
      setIsLoading(true);
      let updatedCount = 0;
      
      // 日別支出データの修復
      const dailyExpensesRef = collection(db, 'dailyExpenses');
      const dailySnapshot = await getDocs(dailyExpensesRef);
      
      for (const doc of dailySnapshot.docs) {
        const data = doc.data();
        
        // monthStringがないデータを修復
        if (!data.monthString && data.date) {
          try {
            const date = data.date?.toDate ? data.date.toDate() : 
                         typeof data.date === 'string' ? new Date(data.date) : new Date();
            const monthString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            await updateDoc(doc.ref, { monthString });
            updatedCount++;
            console.log(`日別支出データを修復: ${doc.id}, monthString=${monthString}`);
          } catch (error) {
            console.error(`日別支出データ修復エラー (${doc.id}):`, error);
          }
        }
      }
      
      // 月間支出データの修復
      const monthlyExpensesRef = collection(db, 'expenses');
      const monthlySnapshot = await getDocs(monthlyExpensesRef);
      
      for (const doc of monthlySnapshot.docs) {
        const docData = doc.data();
        
        // monthStringがないデータを修復
        if (!docData.monthString) {
          try {
            // 日付がある場合はそこから取得
            if (docData.date) {
              const date = docData.date?.toDate ? docData.date.toDate() : 
                           typeof docData.date === 'string' ? new Date(docData.date) : new Date();
              const monthString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              
              await updateDoc(doc.ref, { 
                monthString,
                date: date  // 念のために日付も更新
              });
              updatedCount++;
              console.log(`月間支出データを修復 (日付あり): ${doc.id}, monthString=${monthString}`);
            } else {
              // 日付がない場合は現在の月を使用
              const monthString = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}`;
              const date = new Date(currentMonth.year, currentMonth.month - 1, 1);
              
              await updateDoc(doc.ref, { 
                monthString,
                date: date  // 日付も設定
              });
              updatedCount++;
              console.log(`月間支出データを修復 (日付なし): ${doc.id}, monthString=${monthString}`);
            }
          } catch (error) {
            console.error(`月間支出データ修復エラー (${doc.id}):`, error);
          }
        }
      }
      
      setIsLoading(false);
      
      if (updatedCount > 0) {
        console.log(`${updatedCount}件のデータを修復しました`);
        alert(`${updatedCount}件のデータを修復しました。アプリを再読み込みしてください。`);
        // データ再読み込み
        window.location.reload();
      } else {
        alert('修復が必要なデータはありませんでした');
      }
    } catch (error) {
      setIsLoading(false);
      console.error("データ修復エラー:", error);
      alert(`データの修復中にエラーが発生しました: ${error.message}`);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">家計簿アプリ</h1>
        
        {/* 月選択UI */}
        <div className="flex items-center justify-center space-x-4">
          <button 
            onClick={goToPrevMonth}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-l"
          >
            ←
          </button>
          <span className="text-lg font-semibold">{formatSelectedMonth()}</span>
          <button 
            onClick={goToNextMonth}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-r"
          >
            →
          </button>
        </div>
        
        <div>
          {/* 予備スペース */}
        </div>
      </header>
      
      {/* タブナビゲーション */}
      <nav className="flex border-b border-gray-800">
        <button
          className={`flex-1 py-3 px-2 ${activeTab === 'me' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('me')}
        >
          自分
        </button>
        <button
          className={`flex-1 py-3 px-2 ${activeTab === 'partner' ? 'border-b-2 border-purple-500 text-purple-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('partner')}
        >
          パートナー
        </button>
        <button
          className={`flex-1 py-3 px-2 ${activeTab === 'joint' ? 'border-b-2 border-green-500 text-green-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('joint')}
        >
          共同
        </button>
        <button
          className={`flex-1 py-3 px-2 ${activeTab === 'daily' ? 'border-b-2 border-red-500 text-red-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('daily')}
        >
          日別
        </button>
        <button
          className={`flex-1 py-3 px-2 ${activeTab === 'monthly' ? 'border-b-2 border-yellow-500 text-yellow-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('monthly')}
        >
          月間
        </button>
        <button
          className={`flex-1 py-3 px-2 ${activeTab === 'settings' ? 'border-b-2 border-yellow-500 text-yellow-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('settings')}
        >
          設定
        </button>
      </nav>
      
      {/* タブコンテンツ */}
      <main className="flex-1 overflow-y-auto p-4">
        {activeTab === 'me' && <MyTabContent />}
        {activeTab === 'partner' && <PartnerTabContent />}
        {activeTab === 'joint' && <JointTabContent />}
        {activeTab === 'daily' && <DailyTabContent />}
        {activeTab === 'monthly' && <MonthlyTabContent />}
        {activeTab === 'settings' && <SettingsView />}
      </main>
      
      {/* 月選択UI */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={goToPrevMonth}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-l"
        >
          ←
        </button>
        <h2 className="text-xl font-bold">{formatSelectedMonth()}</h2>
        <button 
          onClick={goToNextMonth}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-r"
        >
          →
        </button>
      </div>
      
      {/* 新規追加ボタン */}
      <div className="fixed bottom-6 right-6">
        <button 
          onClick={() => setShowTemplates(true)}
          className="bg-red-500 text-white rounded-full w-14 h-14 flex items-center justify-center text-2xl shadow-lg"
        >
          +
        </button>
      </div>
      
      {/* テンプレート選択モーダル */}
      {showTemplates && <TemplateSelector />}
      
      {/* 金額入力モーダル */}
      {showTemplateAmountInput && (
        <AmountInput 
          onSave={handleTemplateAmountSave}
          onCancel={() => {
            setShowTemplateAmountInput(false);
            setSelectedTemplate(null);
          }}
        />
      )}
      
      {/* 詳細入力モーダル */}
      {showExpenseInput && <ExpenseInputModal />}
      
      {/* 削除確認モーダル */}
      {showDeleteConfirmModal && (
        <DeleteConfirmModal 
          show={showDeleteConfirmModal} 
          onHide={() => setShowDeleteConfirmModal(false)} 
          displayData={selectedExpense || expenseToDelete} 
          onDelete={async (data) => {
            try {
              if (data.type === 'all_monthly') {
                // すべての月間データを削除
                console.log("すべての月間データの削除を開始");
                setIsLoading(true);
                
                // すべての月間データを取得
                const monthlyExpensesRef = collection(db, 'expenses');
                const monthlySnapshot = await getDocs(monthlyExpensesRef);
                
                let deletedCount = 0;
                
                // すべての月間データを削除
                for (const doc of monthlySnapshot.docs) {
                  try {
                    await deleteDoc(doc.ref);
                    deletedCount++;
                    console.log(`月間データを削除: ${doc.id}`);
                  } catch (error) {
                    console.error(`月間データ削除エラー (${doc.id}):`, error);
                  }
                }
                
                // ローカルデータも初期化
                setExpenses({});
                
                setIsLoading(false);
                
                if (deletedCount > 0) {
                  console.log(`${deletedCount}件の月間データを削除しました`);
                  alert(`${deletedCount}件の月間データを削除しました`);
                } else {
                  alert('月間データはありませんでした');
                }
              } else if (data.type === 'cleanup_monthly') {
                // 孤立した月間データを削除
                console.log("孤立した月間データの削除を開始");
                setIsLoading(true);
                let deletedCount = 0;
                
                // すべての月間データを取得
                const monthlyExpensesRef = collection(db, 'expenses');
                const monthlySnapshot = await getDocs(monthlyExpensesRef);
                
                // 孤立した月間データを削除
                for (const doc of monthlySnapshot.docs) {
                  const docData = doc.data();
                  if (!docData.category) {
                    try {
                      await deleteDoc(doc.ref);
                      deletedCount++;
                      console.log(`孤立した月間データを削除: ${doc.id}`);
                    } catch (error) {
                      console.error(`孤立した月間データ削除エラー (${doc.id}):`, error);
                    }
                  }
                }
                
                // ローカルデータも更新
                setExpenses(prev => {
                  const newData = { ...prev };
                  for (const id in newData) {
                    if (!newData[id].category) {
                      delete newData[id];
                    }
                  }
                  return newData;
                });
                
                setIsLoading(false);
                
                if (deletedCount > 0) {
                  console.log(`${deletedCount}件の孤立した月間データを削除しました`);
                  alert(`${deletedCount}件の孤立した月間データを削除しました`);
                } else {
                  alert('孤立した月間データはありませんでした');
                }
              } else {
                // 単一の支出データを削除
                await deleteDailyExpense(data.id);
              }
              
              // モーダルを閉じる
              setShowDeleteConfirmModal(false);
            } catch (error) {
              setIsLoading(false);
              console.error("削除処理エラー:", error);
              alert(`削除処理中にエラーが発生しました: ${error.message}`);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
