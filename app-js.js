import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  onSnapshot
} from 'firebase/firestore';

function App() {
  // アクティブなタブ
  const [activeTab, setActiveTab] = useState('me');
  
  // 現在の月
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };
  });
  
  // 日別支出入力モーダル表示フラグ
  const [showExpenseInput, setShowExpenseInput] = useState(false);
  
  // テンプレート選択モーダル表示フラグ
  const [showTemplates, setShowTemplates] = useState(false);
  
  // テンプレート金額入力モーダル表示フラグ
  const [showTemplateAmountInput, setShowTemplateAmountInput] = useState(false);
  
  // 選択されたテンプレート
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // 支出データ
  const [expenses, setExpenses] = useState({});
  
  // 日別支出データ
  const [dailyExpenses, setDailyExpenses] = useState({});
  
  // データ読み込み中フラグ
  const [loading, setLoading] = useState(true);
  
  // Firebase からデータを読み込む
  useEffect(() => {
    // Firebase があるとコメントアウトを解除してください
    /*
    const fetchData = async () => {
      try {
        // 固定費/変動費データ取得
        const expensesRef = collection(db, 'expenses');
        const expensesSnapshot = await getDocs(expensesRef);
        
        const expensesData = {};
        expensesSnapshot.forEach((doc) => {
          expensesData[doc.id] = doc.data();
        });
        
        setExpenses(expensesData);
        
        // 日別支出データ取得
        const year = currentMonth.year;
        const month = currentMonth.month;
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
        
        const dailyExpensesRef = collection(db, 'dailyExpenses');
        const q = query(
          dailyExpensesRef, 
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date', 'desc')
        );
        
        const dailySnapshot = await getDocs(q);
        
        const dailyData = {};
        dailySnapshot.forEach((doc) => {
          const data = doc.data();
          if (!dailyData[data.date]) {
            dailyData[data.date] = [];
          }
          dailyData[data.date].push({
            id: doc.id,
            ...data
          });
        });
        
        setDailyExpenses(dailyData);
        
      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    */

    // Firebase の代わりに初期データをロード（開発用）
    const loadInitialData = () => {
      // 支出初期データ
      setExpenses({
        // 共同固定費
        'rent': { name: '家賃', amount: 100000, split: true, type: 'fixed', icon: '🏠' },
        'water': { name: '水道代', amount: 5000, split: true, type: 'fixed', icon: '💧' },
        'electricity': { name: '電気代', amount: 8000, split: true, type: 'fixed', icon: '💡' },
        'gas': { name: 'ガス代', amount: 6000, split: true, type: 'fixed', icon: '🔥' },
        'internet': { name: 'インターネット', amount: 7000, split: true, type: 'fixed', icon: '🌐' },
        
        // 共同変動費
        'groceries': { name: '食費', amount: 35000, split: true, type: 'variable', icon: '🍚' },
        'dining': { name: '外食費', amount: 15000, split: true, type: 'variable', icon: '🍽️' },
        'daily_items': { name: '日用品', amount: 8000, split: true, type: 'variable', icon: '🧴' },
        
        // 自分の固定費
        'my_subscription': { name: 'サブスク', amount: 2000, split: false, owner: 'me', type: 'fixed', icon: '📺' },
        'my_phone': { name: '携帯料金', amount: 5000, split: false, owner: 'me', type: 'fixed', icon: '📱' },
        
        // 自分の変動費
        'my_transport': { name: '交通費', amount: 8000, split: false, owner: 'me', type: 'variable', icon: '🚃' },
        'my_personal': { name: '個人支出', amount: 10000, split: false, owner: 'me', type: 'variable', icon: '👤' },
        
        // パートナーの固定費
        'partner_subscription': { name: '音楽サブスク', amount: 980, split: false, owner: 'partner', type: 'fixed', icon: '🎵' },
        'partner_insurance': { name: '保険料', amount: 3500, split: false, owner: 'partner', type: 'fixed', icon: '📝' },
        
        // パートナーの変動費
        'partner_transport': { name: '交通費', amount: 6000, split: false, owner: 'partner', type: 'variable', icon: '🚃' },
        'partner_personal': { name: '個人支出', amount: 12000, split: false, owner: 'partner', type: 'variable', icon: '👤' }
      });
      
      // 日別支出初期データ
      setDailyExpenses({
        '2025-03-01': [
          { id: 'e1', name: 'ピザ', category: 'dining', amount: 1090, split: true, type: 'variable', icon: '🍕' },
          { id: 'e2', name: 'ドリンク', category: 'dining', amount: 120, split: true, type: 'variable', icon: '🥤' },
          { id: 'e3', name: 'パキ童オンリー', category: 'entertainment', amount: 1863, split: false, owner: 'me', type: 'variable', icon: '🎮' },
          { id: 'e4', name: 'コンビニ', category: 'grocery', amount: 1009, split: true, type: 'variable', icon: '🏪' }
        ],
        '2025-03-02': [
          { id: 'e5', name: '電車', category: 'transport', amount: 760, split: false, owner: 'me', type: 'variable', icon: '🚃' }
        ],
        '2025-03-04': [
          { id: 'e6', name: 'スーパー', category: 'grocery', amount: 3280, split: true, type: 'variable', icon: '🛒' }
        ]
      });
      
      setLoading(false);
    };
    
    loadInitialData();
  }, [currentMonth]);
  
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
  
  // 新しい支出を追加
  const addExpense = async (expenseData) => {
    try {
      // Firebase があるとコメントアウトを解除してください
      /*
      if (expenseData.date) {
        // 日別支出データに追加
        const dailyExpenseRef = doc(collection(db, 'dailyExpenses'));
        await setDoc(dailyExpenseRef, expenseData);
        
        // ローカルにも追加
        const date = expenseData.date;
        setDailyExpenses(prev => ({
          ...prev,
          [date]: [...(prev[date] || []), {
            id: dailyExpenseRef.id,
            ...expenseData
          }]
        }));
      }
      
      // テンプレートから追加された場合は、固定費/変動費データにも反映
      if (expenseData.fromTemplate) {
        const expenseRef = doc(db, 'expenses', expenseData.id);
        const expenseDoc = {
          name: expenseData.name,
          amount: expenseData.amount,
          split: expenseData.split,
          owner: expenseData.owner,
          type: expenseData.type,
          icon: expenseData.icon
        };
        
        await setDoc(expenseRef, expenseDoc);
        
        // ローカルにも追加
        setExpenses(prev => ({
          ...prev,
          [expenseData.id]: expenseDoc
        }));
      }
      */
      
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
            owner: expenseData.owner,
            type: expenseData.type,
            icon: expenseData.icon
          }
        }));
      }
      
      // モーダルを閉じる
      setShowExpenseInput(false);
      setShowTemplates(false);
      setShowTemplateAmountInput(false);
      
    } catch (error) {
      console.error("Error adding expense: ", error);
      alert("エラーが発生しました: " + error.message);
    }
  };
  
  // 費用の更新
  const updateExpense = async (id, amount) => {
    try {
      // Firebase があるとコメントアウトを解除してください
      /*
      const expenseRef = doc(db, 'expenses', id);
      await updateDoc(expenseRef, { amount });
      */
      
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
  
  // 費用項目コンポーネント
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
            {myFixedExpenses.map(([id, item]) => (
              <ExpenseItem key={id} id={id} item={item} />
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
            {myVariableExpenses.map(([id, item]) => (
              <ExpenseItem key={id} id={id} item={item} />
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
            {partnerFixedExpenses.map(([id, item]) => (
              <ExpenseItem key={id} id={id} item={item} />
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
            {partnerVariableExpenses.map(([id, item]) => (
              <ExpenseItem key={id} id={id} item={item} />
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
    
    // 総計
    const totalExpense = jointFixedTotal + jointVariableTotal + myTotal + partnerTotal;
    
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2 border-b border-gray-700 pb-2 text-blue-400">共同固定費</h2>
          <div className="space-y-1">
            {jointFixedExpenses.map(([id, item]) => (
              <ExpenseItem key={id} id={id} item={item} />
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
            {jointVariableExpenses.map(([id, item]) => (
              <ExpenseItem key={id} id={id} item={item} />
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
            {myExpenses.map(([id, item]) => (
              <ExpenseItem key={id} id={id} item={item} editable={false} />
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
            {partnerExpenses.map(([id, item]) => (
              <ExpenseItem key={id} id={id} item={item} editable={false} />
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
    // 月間合計の計算
    const calculateMonthlyTotals = () => {
      let income = 0;
      let expense = 0;
      
      Object.entries(dailyExpenses).forEach(([date, expenses]) => {
        // 現在の月のものだけ集計
        const dateObj = new Date(date);
        if (dateObj.getFullYear() === currentMonth.year && dateObj.getMonth() + 1 === currentMonth.month) {
          expenses.forEach(item => {
            expense += item.amount;
          });
        }
      });
      
      return { income, expense, balance: income - expense };
    };
    
    const { income, expense, balance } = calculateMonthlyTotals();
    
    // 現在の月のデータをフィルタリング
    const filteredDates = Object.keys(dailyExpenses)
      .filter(date => {
        const dateObj = new Date(date);
        return dateObj.getFullYear() === currentMonth.year && dateObj.getMonth() + 1 === currentMonth.month;
      })
      .sort((a, b) => new Date(b) - new Date(a)); // 日付の降順
    
    // 日別支出リストの生成
    const dailyExpensesList = filteredDates.map(date => {
      const expenses = dailyExpenses[date];
      const dayTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
      const dateObj = new Date(date);
      const day = dateObj.getDate();
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
      const dayClass = dateObj.getDay() === 0 ? 'text-red-500' : 
                      dateObj.getDay() === 6 ? 'text-blue-500' : '';
      
      return (
        <div key={date} className="mb-4">
          {/* 日付ヘッダー */}
          <div className="flex justify-between items-center py-2 bg-gray-800 px-3">
            <div className="flex items-center">
              <span className="text-xl font-bold mr-2">{day}</span>
              <span className={`text-sm py-1 px-2 rounded ${dayClass}`}>{dayOfWeek}曜日</span>
              <span className="text-xs text-gray-400 ml-2">{date.split('-')[1]}/{date.split('-')[2]}</span>
            </div>
            <div className="flex items-center">
              <span className="text-lg font-medium text-red-500">
                ¥ {dayTotal.toLocaleString()}
              </span>
            </div>
          </div>
          
          {/* 費用リスト */}
          <div className="bg-gray-900">
            {expenses.map(expense => (
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
                  <div className="text-xs text-gray-400">{expense.type === 'fixed' ? '固定費' : '変動費'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    });
    
    return (
      <div>
        {/* 月サマリー */}
        <div className="flex justify-between bg-gray-800 p-4 mb-4 rounded-lg">
          <div className="text-center">
            <div className="text-gray-400">収入</div>
            <div className="text-blue-500 font-medium">{income.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">支出</div>
            <div className="text-red-500 font-medium">{expense.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">合計</div>
            <div className={balance >= 0 ? 'text-blue-500 font-medium' : 'text-red-500 font-medium'}>
              {balance.toLocaleString()}
            </div>
          </div>
        </div>
        
        {/* 日別支出リスト */}
        {dailyExpensesList.length > 0 ? (
          dailyExpensesList
        ) : (
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p>この月の記録はまだありません</p>
            <button 
              onClick={() => setShowTemplates(true)}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded"
            >
              記録を追加する
            </button>
          </div>
        )}
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
              <span className="text-2xl mr-2">{selectedTemplate?.icon}</span>
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
                    className="bg-gray-700 hover:bg-gray-600 py-2 rounded"
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
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">¥</span>
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
  
  // ローディング表示
  if (loading) {
    return (
      <div className="bg-gray-900 text-white min-h-screen flex justify-center items-center">
        <p className="text-xl">データを読み込み中...</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="p-4 flex items-center justify-between border-b border-gray-800">
        <h1 className="text-xl font-bold">{getMonthDisplay()}</h1>
        <div className="flex items-center">
          <button className="p-1 text-gray-400 mx-1">
            <span className="text-xl">⭐</span>
          </button>
          <button className="p-1 text-gray-400 mx-1">
            <span className="text-xl">🎤</span>
          </button>
          <button className="p-1 text-gray-400 mx-1">
            <span className="text-xl">🔍</span>
          </button>
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
      </nav>
      
      {/* タブコンテンツ */}
      <main className="flex-1 overflow-y-auto p-4">
        {activeTab === 'me' && <MyTabContent />}
        {activeTab === 'partner' && <PartnerTabContent />}
        {activeTab === 'joint' && <JointTabContent />}
        {activeTab === 'daily' && <DailyTabContent />}
      </main>
      
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
    </div>
  );
}

export default App;
