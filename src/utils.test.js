import '@testing-library/jest-dom';

// IDと変換ユーティリティのテスト
describe('ID生成と変換のテスト', () => {
  // カテゴリIDの生成テスト
  describe('カテゴリID生成テスト', () => {
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

    test('共同支出のカテゴリIDはカテゴリ名そのものである', () => {
      expect(generateCategoryId('grocery', true, null)).toBe('grocery');
      expect(generateCategoryId('rent', true, null)).toBe('rent');
      expect(generateCategoryId('utility', true, null)).toBe('utility');
    });

    test('自分の支出のカテゴリIDには「my_」プレフィックスが付く', () => {
      expect(generateCategoryId('grocery', false, 'me')).toBe('my_grocery');
      expect(generateCategoryId('hobby', false, 'me')).toBe('my_hobby');
      expect(generateCategoryId('clothing', false, 'me')).toBe('my_clothing');
    });

    test('パートナーの支出のカテゴリIDには「partner_」プレフィックスが付く', () => {
      expect(generateCategoryId('grocery', false, 'partner')).toBe('partner_grocery');
      expect(generateCategoryId('hobby', false, 'partner')).toBe('partner_hobby');
      expect(generateCategoryId('clothing', false, 'partner')).toBe('partner_clothing');
    });
  });

  // カテゴリID解析テスト
  describe('カテゴリID解析テスト', () => {
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

    test('通常のカテゴリIDは共同支出として解析される', () => {
      const result = parseCategoryId('grocery');
      expect(result.category).toBe('grocery');
      expect(result.split).toBe(true);
      expect(result.owner).toBeNull();
    });

    test('「my_」プレフィックス付きのIDは自分の支出として解析される', () => {
      const result = parseCategoryId('my_grocery');
      expect(result.category).toBe('grocery');
      expect(result.split).toBe(false);
      expect(result.owner).toBe('me');
    });

    test('「partner_」プレフィックス付きのIDはパートナーの支出として解析される', () => {
      const result = parseCategoryId('partner_grocery');
      expect(result.category).toBe('grocery');
      expect(result.split).toBe(false);
      expect(result.owner).toBe('partner');
    });
  });

  // エラーケース処理テスト
  describe('IDエラー処理テスト', () => {
    function validateMonthlyId(monthlyId) {
      if (!monthlyId) {
        return { valid: false, error: 'IDが指定されていません' };
      }
      
      if (typeof monthlyId !== 'string') {
        return { valid: false, error: 'IDは文字列である必要があります' };
      }
      
      if (monthlyId.includes('/') || monthlyId.includes('.')) {
        return { valid: false, error: 'IDに無効な文字が含まれています' };
      }
      
      return { valid: true };
    }

    test('有効なIDは検証に合格する', () => {
      expect(validateMonthlyId('grocery').valid).toBe(true);
      expect(validateMonthlyId('my_grocery').valid).toBe(true);
      expect(validateMonthlyId('partner_grocery').valid).toBe(true);
    });

    test('nullまたはundefinedのIDは無効とマークされる', () => {
      expect(validateMonthlyId(null).valid).toBe(false);
      expect(validateMonthlyId(undefined).valid).toBe(false);
    });

    test('数値型のIDは無効とマークされる', () => {
      expect(validateMonthlyId(123).valid).toBe(false);
    });

    test('特殊文字を含むIDは無効とマークされる', () => {
      expect(validateMonthlyId('grocery/food').valid).toBe(false);
      expect(validateMonthlyId('my.grocery').valid).toBe(false);
    });
  });
});
