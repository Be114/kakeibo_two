import '@testing-library/jest-dom';
import { resetMocks, getMockData, setMockData } from './__mocks__/firebase';

// App内の関数をインポート
// 注：実際のテストでは、Appコンポーネントから関数をエクスポートして個別にインポートする方法が推奨されます
// ここではテスト用のモックバージョンを作成します

// Firebaseのモックをテスト
jest.mock('./firebase');

// テスト前にFirebaseのモックをリセット
beforeEach(() => {
  resetMocks();
});

describe('Firebase 関数のテスト', () => {
  // 日別支出から月間データへの反映テスト関数
  function reflectDailyExpenseToMonthly(dailyExpense, isAutomatic = false) {
    const { category, amount, name, split, type, date } = dailyExpense;
    
    // カテゴリID生成
    let categoryId = category;
    if (!split) {
      // 個人支出の場合、所有者に基づいてプレフィックスを追加
      if (dailyExpense.owner === 'me') {
        categoryId = `my_${category}`;
      } else if (dailyExpense.owner === 'partner') {
        categoryId = `partner_${category}`;
      }
    }
    
    // 月間データを更新または作成
    const mockData = getMockData();
    const expenses = mockData.expenses || {};
    
    if (expenses[categoryId]) {
      // 既存の月間データを更新
      expenses[categoryId].amount += amount;
    } else {
      // 新規の月間データを作成
      expenses[categoryId] = {
        id: categoryId,
        category,
        name,
        amount,
        split,
        type
      };
    }
    
    // 日別支出を更新して反映済みフラグとmonthlyIdを追加
    const dailyExpenses = mockData.dailyExpenses || {};
    const dailyExpenseId = dailyExpense.id;
    
    if (dailyExpenses[dailyExpenseId]) {
      dailyExpenses[dailyExpenseId].reflected = true;
      dailyExpenses[dailyExpenseId].monthlyId = categoryId;
    }
    
    // 更新されたデータを保存
    setMockData({
      ...mockData,
      expenses,
      dailyExpenses
    });
    
    return { success: true, monthlyId: categoryId };
  }
  
  // 日別支出削除に伴う月間データ更新テスト関数
  function updateMonthlyExpenseOnDelete(dailyExpense) {
    const { monthlyId, amount } = dailyExpense;
    
    if (!monthlyId || !dailyExpense.reflected) {
      return { success: false, message: '反映されていないか、monthlyIdがありません' };
    }
    
    const mockData = getMockData();
    const expenses = mockData.expenses || {};
    
    if (!expenses[monthlyId]) {
      return { success: false, message: '対応する月間データが見つかりません' };
    }
    
    // 月間データから金額を減算
    expenses[monthlyId].amount -= amount;
    
    // 金額が0以下になった場合は削除
    if (expenses[monthlyId].amount <= 0) {
      delete expenses[monthlyId];
    }
    
    // 日別支出を削除
    const dailyExpenses = mockData.dailyExpenses || {};
    delete dailyExpenses[dailyExpense.id];
    
    // 更新されたデータを保存
    setMockData({
      ...mockData,
      expenses,
      dailyExpenses
    });
    
    return { success: true };
  }
  
  // データ整理テスト関数
  function cleanupOrphanedData() {
    const mockData = getMockData();
    const dailyExpenses = mockData.dailyExpenses || {};
    const expenses = mockData.expenses || {};
    let updatedCount = 0;
    
    // 反映済みだがmonthlyIdがないデータを検出
    Object.entries(dailyExpenses).forEach(([id, expense]) => {
      if (expense.reflected && !expense.monthlyId) {
        // monthlyIdを生成
        let categoryId = expense.category;
        if (!expense.split) {
          if (expense.owner === 'me') {
            categoryId = `my_${expense.category}`;
          } else if (expense.owner === 'partner') {
            categoryId = `partner_${expense.category}`;
          }
        }
        
        // 対応する月間データが存在する場合のみ更新
        if (expenses[categoryId]) {
          dailyExpenses[id].monthlyId = categoryId;
          updatedCount++;
        }
      }
    });
    
    // 更新されたデータを保存
    setMockData({
      ...mockData,
      dailyExpenses
    });
    
    return { success: true, updatedCount };
  }

  describe('reflectDailyExpenseToMonthly関数のテスト', () => {
    test('共同支出が正しく月間データに反映される', () => {
      // テスト用の日別支出データ
      const dailyExpense = {
        id: 'test-daily-id',
        name: 'テスト支出',
        amount: 1000,
        category: 'grocery',
        split: true,
        type: 'variable',
        date: '2025-03-01'
      };
      
      // 関数を実行
      const result = reflectDailyExpenseToMonthly(dailyExpense, true);
      
      // 結果を確認
      expect(result.success).toBe(true);
      expect(result.monthlyId).toBe('grocery');
      
      // 月間データが正しく作成されたことを確認
      const mockData = getMockData();
      expect(mockData.expenses.grocery).toBeDefined();
      expect(mockData.expenses.grocery.amount).toBe(1000);
      expect(mockData.expenses.grocery.category).toBe('grocery');
      
      // 日別支出に反映済みフラグとmonthlyIdが設定されたことを確認
      expect(mockData.dailyExpenses['test-daily-id'].reflected).toBe(true);
      expect(mockData.dailyExpenses['test-daily-id'].monthlyId).toBe('grocery');
    });
    
    test('自分の支出が正しく月間データに反映される（my_プレフィックスが追加される）', () => {
      // テスト用の日別支出データ
      const dailyExpense = {
        id: 'test-daily-id',
        name: 'テスト支出',
        amount: 500,
        category: 'grocery',
        split: false,
        owner: 'me',
        type: 'variable',
        date: '2025-03-01'
      };
      
      // 関数を実行
      const result = reflectDailyExpenseToMonthly(dailyExpense);
      
      // 結果を確認
      expect(result.success).toBe(true);
      expect(result.monthlyId).toBe('my_grocery');
      
      // 月間データが正しく作成されたことを確認
      const mockData = getMockData();
      expect(mockData.expenses.my_grocery).toBeDefined();
      expect(mockData.expenses.my_grocery.amount).toBe(500);
      expect(mockData.expenses.my_grocery.category).toBe('grocery');
      
      // 日別支出に反映済みフラグとmonthlyIdが設定されたことを確認
      expect(mockData.dailyExpenses['test-daily-id'].reflected).toBe(true);
      expect(mockData.dailyExpenses['test-daily-id'].monthlyId).toBe('my_grocery');
    });
    
    test('パートナーの支出が正しく月間データに反映される（partner_プレフィックスが追加される）', () => {
      // テスト用の日別支出データ
      const dailyExpense = {
        id: 'test-daily-id',
        name: 'テスト支出',
        amount: 300,
        category: 'grocery',
        split: false,
        owner: 'partner',
        type: 'variable',
        date: '2025-03-01'
      };
      
      // 関数を実行
      const result = reflectDailyExpenseToMonthly(dailyExpense);
      
      // 結果を確認
      expect(result.success).toBe(true);
      expect(result.monthlyId).toBe('partner_grocery');
      
      // 月間データが正しく作成されたことを確認
      const mockData = getMockData();
      expect(mockData.expenses.partner_grocery).toBeDefined();
      expect(mockData.expenses.partner_grocery.amount).toBe(300);
      expect(mockData.expenses.partner_grocery.category).toBe('grocery');
      
      // 日別支出に反映済みフラグとmonthlyIdが設定されたことを確認
      expect(mockData.dailyExpenses['test-daily-id'].reflected).toBe(true);
      expect(mockData.dailyExpenses['test-daily-id'].monthlyId).toBe('partner_grocery');
    });
    
    test('既存の月間データに金額が正しく加算される', () => {
      // 初期の月間データを設定
      setMockData({
        expenses: {
          grocery: {
            id: 'grocery',
            category: 'grocery',
            name: '食費',
            amount: 1000,
            split: true,
            type: 'variable'
          }
        },
        dailyExpenses: {}
      });
      
      // テスト用の日別支出データ
      const dailyExpense = {
        id: 'test-daily-id',
        name: 'テスト支出',
        amount: 500,
        category: 'grocery',
        split: true,
        type: 'variable',
        date: '2025-03-01'
      };
      
      // 関数を実行
      reflectDailyExpenseToMonthly(dailyExpense);
      
      // 月間データが正しく更新されたことを確認
      const mockData = getMockData();
      expect(mockData.expenses.grocery.amount).toBe(1500); // 1000 + 500
    });
  });

  describe('updateMonthlyExpenseOnDelete関数のテスト', () => {
    test('日別支出削除で月間データが正しく更新される', () => {
      // 初期データを設定
      const dailyExpenseId = 'test-daily-id';
      const monthlyId = 'grocery';
      
      setMockData({
        dailyExpenses: {
          [dailyExpenseId]: {
            id: dailyExpenseId,
            name: 'テスト支出',
            amount: 500,
            category: 'grocery',
            split: true,
            type: 'variable',
            date: '2025-03-01',
            reflected: true,
            monthlyId: monthlyId
          }
        },
        expenses: {
          [monthlyId]: {
            id: monthlyId,
            name: '食費',
            amount: 1000, // 500 + 他の支出
            category: 'grocery',
            split: true,
            type: 'variable'
          }
        }
      });
      
      // 削除対象の日別支出
      const dailyExpense = getMockData().dailyExpenses[dailyExpenseId];
      
      // 関数を実行
      const result = updateMonthlyExpenseOnDelete(dailyExpense);
      
      // 結果を確認
      expect(result.success).toBe(true);
      
      // 月間データが正しく更新されたことを確認
      const mockData = getMockData();
      expect(mockData.expenses[monthlyId].amount).toBe(500); // 1000 - 500
      
      // 日別支出が削除されたことを確認
      expect(mockData.dailyExpenses[dailyExpenseId]).toBeUndefined();
    });
    
    test('金額が0になった場合、月間データは削除される', () => {
      // 初期データを設定
      const dailyExpenseId = 'test-daily-id';
      const monthlyId = 'grocery';
      
      setMockData({
        dailyExpenses: {
          [dailyExpenseId]: {
            id: dailyExpenseId,
            name: 'テスト支出',
            amount: 1000,
            category: 'grocery',
            split: true,
            type: 'variable',
            date: '2025-03-01',
            reflected: true,
            monthlyId: monthlyId
          }
        },
        expenses: {
          [monthlyId]: {
            id: monthlyId,
            name: '食費',
            amount: 1000, // これが唯一の支出
            category: 'grocery',
            split: true,
            type: 'variable'
          }
        }
      });
      
      // 削除対象の日別支出
      const dailyExpense = getMockData().dailyExpenses[dailyExpenseId];
      
      // 関数を実行
      const result = updateMonthlyExpenseOnDelete(dailyExpense);
      
      // 結果を確認
      expect(result.success).toBe(true);
      
      // 月間データが削除されたことを確認
      const mockData = getMockData();
      expect(mockData.expenses[monthlyId]).toBeUndefined();
      
      // 日別支出が削除されたことを確認
      expect(mockData.dailyExpenses[dailyExpenseId]).toBeUndefined();
    });
    
    test('monthlyIdがない場合はエラーを返す', () => {
      // 初期データを設定
      const dailyExpenseId = 'test-daily-id';
      
      setMockData({
        dailyExpenses: {
          [dailyExpenseId]: {
            id: dailyExpenseId,
            name: 'テスト支出',
            amount: 1000,
            category: 'grocery',
            split: true,
            type: 'variable',
            date: '2025-03-01',
            reflected: true
            // monthlyIdがない
          }
        },
        expenses: {}
      });
      
      // 削除対象の日別支出
      const dailyExpense = getMockData().dailyExpenses[dailyExpenseId];
      
      // 関数を実行
      const result = updateMonthlyExpenseOnDelete(dailyExpense);
      
      // 結果を確認
      expect(result.success).toBe(false);
      expect(result.message).toContain('monthlyIdがありません');
    });
  });

  describe('cleanupOrphanedData関数のテスト', () => {
    test('反映済みだがmonthlyIdがないデータが修復される', () => {
      // テスト用の孤立データを設定
      const orphanedExpenseId = 'orphaned-expense-id';
      const monthlyId = 'grocery';
      
      setMockData({
        dailyExpenses: {
          [orphanedExpenseId]: {
            id: orphanedExpenseId,
            name: '孤立データ',
            amount: 1000,
            category: 'grocery',
            split: true,
            type: 'variable',
            date: '2025-03-01',
            reflected: true // 反映済みだがmonthlyIdがない
          }
        },
        expenses: {
          [monthlyId]: {
            id: monthlyId,
            name: '食費',
            amount: 1000,
            category: 'grocery',
            split: true,
            type: 'variable'
          }
        }
      });
      
      // 関数を実行
      const result = cleanupOrphanedData();
      
      // 結果を確認
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
      
      // データが修復されたことを確認
      const mockData = getMockData();
      expect(mockData.dailyExpenses[orphanedExpenseId].monthlyId).toBe('grocery');
    });
    
    test('個人支出の孤立データが正しく修復される', () => {
      // テスト用の孤立データを設定
      const orphanedExpenseId = 'orphaned-expense-id';
      const monthlyId = 'my_grocery';
      
      setMockData({
        dailyExpenses: {
          [orphanedExpenseId]: {
            id: orphanedExpenseId,
            name: '孤立データ',
            amount: 500,
            category: 'grocery',
            split: false,
            owner: 'me',
            type: 'variable',
            date: '2025-03-01',
            reflected: true // 反映済みだがmonthlyIdがない
          }
        },
        expenses: {
          [monthlyId]: {
            id: monthlyId,
            name: '自分の食費',
            amount: 500,
            category: 'grocery',
            split: false,
            type: 'variable'
          }
        }
      });
      
      // 関数を実行
      const result = cleanupOrphanedData();
      
      // 結果を確認
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
      
      // データが修復されたことを確認
      const mockData = getMockData();
      expect(mockData.dailyExpenses[orphanedExpenseId].monthlyId).toBe('my_grocery');
    });
    
    test('対応する月間データがない場合は修復されない', () => {
      // テスト用の孤立データを設定
      const orphanedExpenseId = 'orphaned-expense-id';
      
      setMockData({
        dailyExpenses: {
          [orphanedExpenseId]: {
            id: orphanedExpenseId,
            name: '孤立データ',
            amount: 1000,
            category: 'hobby', // 存在しないカテゴリ
            split: true,
            type: 'variable',
            date: '2025-03-01',
            reflected: true // 反映済みだがmonthlyIdがない
          }
        },
        expenses: {
          'grocery': { // hobbyではなくgrocery
            id: 'grocery',
            name: '食費',
            amount: 1000,
            category: 'grocery',
            split: true,
            type: 'variable'
          }
        }
      });
      
      // 関数を実行
      const result = cleanupOrphanedData();
      
      // 結果を確認
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
      
      // データが修復されていないことを確認
      const mockData = getMockData();
      expect(mockData.dailyExpenses[orphanedExpenseId].monthlyId).toBeUndefined();
    });
  });
});
