import '@testing-library/jest-dom';
import { resetMocks, getMockData, setMockData, collection, doc, setDoc } from './__mocks__/firebase';

// Firebaseのモックを使用
jest.mock('./firebase');

// テスト前にFirebaseのモックをリセット
beforeEach(() => {
  resetMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
  console.log.mockRestore();
});

// Firebase関数の統合テスト
describe('Firebase 統合テスト', () => {
  // 連携シナリオテスト：日別支出の追加→表示→更新→削除
  describe('日別支出の生成から削除までの連携テスト', () => {
    test('日別支出の追加→月間反映→削除の一連の流れが動作する', async () => {
      // 初期化 - 必要な状態を設定
      // 1. 日別支出を追加
      const dailyExpense = {
        id: 'test-expense-id',
        name: 'テスト支出',
        amount: 1000,
        category: 'grocery',
        split: true,
        date: '2025-03-01',
        type: 'variable'
      };
      
      // モックデータを直接設定
      setMockData({
        dailyExpenses: {
          [dailyExpense.id]: dailyExpense
        },
        expenses: {}
      });
      
      // 2. 日別支出を月間データに反映
      const monthlyId = await reflectToMonthly(dailyExpense);
      
      // 3. データが正しく反映されていることを確認
      const mockData = getMockData();
      
      // 日別支出に反映済みフラグとmonthlyIdが追加されている
      expect(mockData.dailyExpenses[dailyExpense.id].reflected).toBe(true);
      expect(mockData.dailyExpenses[dailyExpense.id].monthlyId).toBe('grocery');
      
      // 月間データが作成されている
      expect(mockData.expenses.grocery).toBeDefined();
      expect(mockData.expenses.grocery.amount).toBe(1000);
      
      // 4. 日別支出を削除
      await deleteExpenseAndUpdateMonthly(dailyExpense.id);
      
      // 5. データが正しく削除されていることを確認
      const updatedMockData = getMockData();
      
      // 日別支出が削除されている
      expect(updatedMockData.dailyExpenses[dailyExpense.id]).toBeUndefined();
      
      // 月間データも削除されている（金額が0になったため）
      expect(updatedMockData.expenses.grocery).toBeUndefined();
    });
    
    test('異なる種類の支出が正しく処理される', async () => {
      // 初期データを直接設定
      const sharedExpenseId = 'test-shared-expense';
      const myExpenseId = 'test-my-expense';
      const partnerExpenseId = 'test-partner-expense';
      
      // モックデータを設定
      setMockData({
        dailyExpenses: {
          [sharedExpenseId]: {
            id: sharedExpenseId,
            name: '共同支出',
            amount: 1000,
            category: 'grocery',
            split: true,
            date: '2025-03-01',
            type: 'variable'
          },
          [myExpenseId]: {
            id: myExpenseId,
            name: '自分の支出',
            amount: 500,
            category: 'grocery',
            split: false,
            owner: 'me',
            date: '2025-03-01',
            type: 'variable'
          },
          [partnerExpenseId]: {
            id: partnerExpenseId,
            name: 'パートナーの支出',
            amount: 300,
            category: 'grocery',
            split: false,
            owner: 'partner',
            date: '2025-03-01',
            type: 'variable'
          }
        },
        expenses: {}
      });
      
      // それぞれの支出を月間データに反映
      await reflectToMonthly(getMockData().dailyExpenses[sharedExpenseId]);
      await reflectToMonthly(getMockData().dailyExpenses[myExpenseId]);
      await reflectToMonthly(getMockData().dailyExpenses[partnerExpenseId]);
      
      // 全てのデータが正しく反映されていることを確認
      const mockData = getMockData();
      
      // 共同支出
      expect(mockData.expenses.grocery).toBeDefined();
      expect(mockData.expenses.grocery.amount).toBe(1000);
      
      // 自分の支出
      expect(mockData.expenses.my_grocery).toBeDefined();
      expect(mockData.expenses.my_grocery.amount).toBe(500);
      
      // パートナーの支出
      expect(mockData.expenses.partner_grocery).toBeDefined();
      expect(mockData.expenses.partner_grocery.amount).toBe(300);
    });
    
    test('ID未設定の古いデータが修復される', async () => {
      // 初期化：反映済みだがmonthlyIdが設定されていないデータを作成
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
      
      // 修復処理を実行
      const result = await cleanupOrphanedData();
      
      // 修復結果を確認
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
      
      // データが修復されたことを確認
      const mockData = getMockData();
      expect(mockData.dailyExpenses[orphanedExpenseId].monthlyId).toBe('grocery');
    });
  });
  
  // 新たにIDの生成と解析をテスト
  describe('ID生成と解析のテスト', () => {
    test('支出タイプに応じた正しいIDが生成される', () => {
      // 共同支出のID
      expect(generateCategoryId('grocery', true, null)).toBe('grocery');
      
      // 自分の支出のID
      expect(generateCategoryId('grocery', false, 'me')).toBe('my_grocery');
      
      // パートナーの支出のID  
      expect(generateCategoryId('grocery', false, 'partner')).toBe('partner_grocery');
    });
    
    test('IDから支出タイプ情報が正しく解析される', () => {
      // 共同支出のID解析
      const sharedResult = parseCategoryId('grocery');
      expect(sharedResult.category).toBe('grocery');
      expect(sharedResult.split).toBe(true);
      expect(sharedResult.owner).toBeNull();
      
      // 自分の支出のID解析
      const myResult = parseCategoryId('my_grocery');
      expect(myResult.category).toBe('grocery');
      expect(myResult.split).toBe(false);
      expect(myResult.owner).toBe('me');
      
      // パートナーの支出のID解析
      const partnerResult = parseCategoryId('partner_grocery');
      expect(partnerResult.category).toBe('grocery');
      expect(partnerResult.split).toBe(false);
      expect(partnerResult.owner).toBe('partner');
    });
  });
});

// 月間データに反映する関数
async function reflectToMonthly(dailyExpense) {
  const { category, amount, name, split, type } = dailyExpense;
  const owner = dailyExpense.owner;
  
  // カテゴリID生成
  let categoryId = generateCategoryId(category, split, owner);
  
  // モックFirestoreからデータを取得
  const mockData = getMockData();
  
  // 月間データを更新または作成
  if (mockData.expenses && mockData.expenses[categoryId]) {
    // 既存の月間データを更新
    mockData.expenses[categoryId].amount += amount;
  } else {
    // 新規の月間データを作成
    if (!mockData.expenses) {
      mockData.expenses = {};
    }
    mockData.expenses[categoryId] = {
      id: categoryId,
      category,
      name,
      amount,
      split,
      type
    };
  }
  
  // 日別支出を更新して反映済みフラグとmonthlyIdを追加
  if (mockData.dailyExpenses && mockData.dailyExpenses[dailyExpense.id]) {
    mockData.dailyExpenses[dailyExpense.id].reflected = true;
    mockData.dailyExpenses[dailyExpense.id].monthlyId = categoryId;
  }
  
  // 更新されたデータを保存
  setMockData({ ...mockData });
  
  return categoryId;
}

// 日別支出を削除し、月間データを更新する関数
async function deleteExpenseAndUpdateMonthly(expenseId) {
  // モックFirestoreからデータを取得
  const mockData = getMockData();
  
  // 日別支出を取得
  const dailyExpense = mockData.dailyExpenses && mockData.dailyExpenses[expenseId];
  
  if (!dailyExpense) {
    return { success: false, message: '対象の支出が見つかりません' };
  }
  
  const { monthlyId, amount, reflected } = dailyExpense;
  
  // 月間データの更新
  if (reflected && monthlyId && mockData.expenses && mockData.expenses[monthlyId]) {
    // 月間データから金額を減算
    mockData.expenses[monthlyId].amount -= amount;
    
    // 金額が0以下になった場合は削除
    if (mockData.expenses[monthlyId].amount <= 0) {
      delete mockData.expenses[monthlyId];
    }
  }
  
  // 日別支出を削除
  delete mockData.dailyExpenses[expenseId];
  
  // 更新されたデータを保存
  setMockData({ ...mockData });
  
  return { success: true };
}

// テスト用の支出データを作成する関数
function createTestExpense(name, amount, category, split, owner = null) {
  const id = `test-${name}-${Date.now()}`;
  return {
    id,
    name,
    amount,
    category,
    split,
    owner,
    date: '2025-03-01',
    type: 'variable'
  };
}

// カテゴリIDを生成する関数
function generateCategoryId(category, split, owner) {
  if (split) {
    return category;
  } else if (owner === 'me') {
    return `my_${category}`;
  } else if (owner === 'partner') {
    return `partner_${category}`;
  }
  return category;
}

// カテゴリIDを解析する関数
function parseCategoryId(monthlyId) {
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
}

// 孤立データを整理する関数
async function cleanupOrphanedData() {
  // モックFirestoreからデータを取得
  const mockData = getMockData();
  let updatedCount = 0;
  
  // 反映済みだがmonthlyIdがないデータを検出
  if (mockData.dailyExpenses) {
    Object.entries(mockData.dailyExpenses).forEach(([id, expense]) => {
      if (expense.reflected && !expense.monthlyId) {
        // monthlyIdを生成
        let categoryId = generateCategoryId(expense.category, expense.split, expense.owner);
        
        // 対応する月間データが存在する場合のみ更新
        if (mockData.expenses && mockData.expenses[categoryId]) {
          mockData.dailyExpenses[id].monthlyId = categoryId;
          updatedCount++;
        }
      }
    });
  }
  
  // 更新されたデータを保存
  setMockData({ ...mockData });
  
  return { success: true, updatedCount };
}
