import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { act } from 'react-dom/test-utils';

// Firebaseのモックをインポート
import { resetMocks, getMockData, setMockData } from './__mocks__/firebase';

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

// テスト用のグローバルモックを設定
jest.mock('./firebase');

// ダイアログのモックを作成
window.alert = jest.fn();
window.confirm = jest.fn(() => true);

describe('家計簿アプリ（Kakeibo Two）のテスト', () => {
  describe('基本機能テスト', () => {
    test('アプリが正常にレンダリングされる', async () => {
      await act(async () => {
        render(<App />);
      });
      
      // タイトルが表示されていることを確認
      expect(screen.getByText(/家計簿/i)).toBeInTheDocument();
    });

    test('タブの切り替えが正常に動作する', async () => {
      await act(async () => {
        render(<App />);
      });
      
      // デフォルトでは「日別」タブがアクティブ
      const dailyTab = screen.getByText('日別').closest('button');
      const monthlyTab = screen.getByText('月間').closest('button');
      
      expect(dailyTab).toHaveClass('bg-blue-500');
      
      // 月間タブに切り替え
      await act(async () => {
        fireEvent.click(monthlyTab);
      });
      
      expect(monthlyTab).toHaveClass('bg-blue-500');
      expect(dailyTab).not.toHaveClass('bg-blue-500');
    });
  });

  describe('支出データ操作テスト', () => {
    test('日別支出を追加すると自動的に月間データに反映される', async () => {
      await act(async () => {
        render(<App />);
      });

      // 支出追加モーダルを開く
      await act(async () => {
        fireEvent.click(screen.getByText('+'));
      });
      
      // テストデータを入力
      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText('支出名称'), { target: { value: 'テスト支出' } });
        fireEvent.change(screen.getByPlaceholderText('金額'), { target: { value: '1000' } });
        
        // カテゴリを選択
        fireEvent.change(screen.getByLabelText('カテゴリ'), { target: { value: 'grocery' } });
        
        // 日付を選択
        const today = new Date().toISOString().split('T')[0];
        fireEvent.change(screen.getByLabelText('日付'), { target: { value: today } });
        
        // 共同支出に設定
        fireEvent.click(screen.getByLabelText('共同'));
        
        // 登録ボタンをクリック
        fireEvent.click(screen.getByText('登録'));
      });
      
      // データが正しく保存されたことを確認
      await waitFor(() => {
        const mockData = getMockData();
        
        // 日別支出データが存在する
        const dailyExpenses = Object.values(mockData.dailyExpenses || {});
        expect(dailyExpenses.length).toBeGreaterThan(0);
        
        // 日別支出データの内容を確認
        const dailyExpense = dailyExpenses.find(e => e.name === 'テスト支出');
        expect(dailyExpense).toBeDefined();
        expect(dailyExpense.amount).toBe(1000);
        expect(dailyExpense.category).toBe('grocery');
        
        // 月間データが反映されている
        const expenses = Object.values(mockData.expenses || {});
        const monthlyExpense = expenses.find(e => e.category === 'grocery');
        expect(monthlyExpense).toBeDefined();
        expect(monthlyExpense.amount).toBe(1000);
      });
    });

    test('日別支出を削除すると月間データからも金額が減算される', async () => {
      // テスト用に初期データを設定
      const dailyExpenseId = 'test-daily-expense-id';
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
            date: '2025-03-02',
            reflected: true,
            monthlyId: monthlyId
          }
        },
        expenses: {
          [monthlyId]: {
            id: monthlyId,
            name: 'テスト支出',
            amount: 1000,
            category: 'grocery',
            split: true,
            type: 'variable'
          }
        }
      });
      
      await act(async () => {
        render(<App />);
      });
      
      // 日別タブを選択
      await act(async () => {
        fireEvent.click(screen.getByText('日別'));
      });
      
      // 削除ボタンをクリック
      const deleteButtons = screen.getAllByText('削除');
      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });
      
      // 削除確認モーダルで「はい」を選択
      await act(async () => {
        fireEvent.click(screen.getByText('はい'));
      });
      
      // データが正しく更新されたことを確認
      await waitFor(() => {
        const mockData = getMockData();
        
        // 日別支出データが削除されている
        expect(Object.keys(mockData.dailyExpenses || {}).length).toBe(0);
        
        // 月間データが削除されている
        expect(Object.keys(mockData.expenses || {}).length).toBe(0);
      });
    });

    test('日別支出を削除後に月間データに残額がある場合は更新される', async () => {
      // テスト用に初期データを設定
      const dailyExpenseId1 = 'test-daily-expense-id-1';
      const dailyExpenseId2 = 'test-daily-expense-id-2';
      const monthlyId = 'grocery';
      
      setMockData({
        dailyExpenses: {
          [dailyExpenseId1]: {
            id: dailyExpenseId1,
            name: 'テスト支出1',
            amount: 1000,
            category: 'grocery',
            split: true,
            type: 'variable',
            date: '2025-03-02',
            reflected: true,
            monthlyId: monthlyId
          },
          [dailyExpenseId2]: {
            id: dailyExpenseId2,
            name: 'テスト支出2',
            amount: 2000,
            category: 'grocery',
            split: true,
            type: 'variable',
            date: '2025-03-02',
            reflected: true,
            monthlyId: monthlyId
          }
        },
        expenses: {
          [monthlyId]: {
            id: monthlyId,
            name: 'テスト支出カテゴリ',
            amount: 3000, // 1000 + 2000
            category: 'grocery',
            split: true,
            type: 'variable'
          }
        }
      });
      
      await act(async () => {
        render(<App />);
      });
      
      // 日別タブを選択
      await act(async () => {
        fireEvent.click(screen.getByText('日別'));
      });
      
      // 削除ボタンをクリック（最初の支出を削除）
      const deleteButtons = screen.getAllByText('削除');
      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });
      
      // 削除確認モーダルで「はい」を選択
      await act(async () => {
        fireEvent.click(screen.getByText('はい'));
      });
      
      // データが正しく更新されたことを確認
      await waitFor(() => {
        const mockData = getMockData();
        
        // 一つの日別支出データが削除されている
        expect(Object.keys(mockData.dailyExpenses || {}).length).toBe(1);
        
        // 月間データが更新されている
        expect(Object.keys(mockData.expenses || {}).length).toBe(1);
        expect(mockData.expenses[monthlyId].amount).toBe(2000);
      });
    });
  });

  describe('IDの扱いに関するテスト', () => {
    test('支出タイプによって正しいIDが生成される', async () => {
      // 共同支出の追加
      await act(async () => {
        render(<App />);
      });
      
      // 共同支出の追加
      await addExpenseWithType('共同支出', 1000, 'grocery', true);
      
      // 自分の支出の追加
      await addExpenseWithType('自分の支出', 500, 'grocery', false, 'me');
      
      // パートナーの支出の追加
      await addExpenseWithType('パートナーの支出', 300, 'grocery', false, 'partner');
      
      // データが正しく保存されたことを確認
      await waitFor(() => {
        const mockData = getMockData();
        const expenses = mockData.expenses || {};
        
        // 共同支出はカテゴリIDをそのまま使用
        expect(expenses['grocery']).toBeDefined();
        expect(expenses['grocery'].amount).toBe(1000);
        
        // 自分の支出は 'my_' プレフィックスを追加
        expect(expenses['my_grocery']).toBeDefined();
        expect(expenses['my_grocery'].amount).toBe(500);
        
        // パートナーの支出は 'partner_' プレフィックスを追加
        expect(expenses['partner_grocery']).toBeDefined();
        expect(expenses['partner_grocery'].amount).toBe(300);
      });
    });

    test('日別支出データには反映済みフラグとmonthlyIdが正しく設定される', async () => {
      await act(async () => {
        render(<App />);
      });
      
      // 支出を追加
      await addExpenseWithType('テスト支出', 1000, 'grocery', true);
      
      // データが正しく保存されたことを確認
      await waitFor(() => {
        const mockData = getMockData();
        const dailyExpenses = Object.values(mockData.dailyExpenses || {});
        
        // 反映済みフラグが設定されている
        expect(dailyExpenses[0].reflected).toBe(true);
        // monthlyIdが正しく設定されている
        expect(dailyExpenses[0].monthlyId).toBe('grocery');
      });
    });
  });

  describe('データの整合性テスト', () => {
    test('cleanupOrphanedData関数は修復対象のデータを正しく修復する', async () => {
      // 修復対象のデータを設定
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
            reflected: true, // 反映済みだがmonthlyIdがない
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
      
      await act(async () => {
        render(<App />);
      });
      
      // 設定タブに移動
      await act(async () => {
        fireEvent.click(screen.getByText('設定'));
      });
      
      // データ修復ボタンをクリック
      await act(async () => {
        fireEvent.click(screen.getByText('過去データの整理'));
      });
      
      // データが正しく修復されたことを確認
      await waitFor(() => {
        const mockData = getMockData();
        const orphanedExpense = mockData.dailyExpenses[orphanedExpenseId];
        
        // monthlyIdが設定された
        expect(orphanedExpense.monthlyId).toBe('grocery');
      });
    });
  });
});

// テスト用のヘルパー関数
async function addExpenseWithType(name, amount, category, isShared, owner = null) {
  // 支出追加モーダルを開く
  await act(async () => {
    fireEvent.click(screen.getByText('+'));
  });
  
  // テストデータを入力
  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText('支出名称'), { target: { value: name } });
    fireEvent.change(screen.getByPlaceholderText('金額'), { target: { value: amount.toString() } });
    
    // カテゴリを選択
    fireEvent.change(screen.getByLabelText('カテゴリ'), { target: { value: category } });
    
    // 日付を選択
    const today = new Date().toISOString().split('T')[0];
    fireEvent.change(screen.getByLabelText('日付'), { target: { value: today } });
    
    // 共同・個人の設定
    if (isShared) {
      fireEvent.click(screen.getByLabelText('共同'));
    } else if (owner === 'me') {
      fireEvent.click(screen.getByLabelText('自分'));
    } else if (owner === 'partner') {
      fireEvent.click(screen.getByLabelText('パートナー'));
    }
    
    // 登録ボタンをクリック
    fireEvent.click(screen.getByText('登録'));
  });
}
