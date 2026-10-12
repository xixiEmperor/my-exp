import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default defineConfig(
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // 必须放在其他规则之前，用来关闭与 Prettier 冲突的规则
      prettierConfig,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      '@stylistic': stylistic,
    },
    rules: {
      // ---------- React Hooks ----------
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ---------- Airbnb: 变量与声明 ----------
      'no-var': 'error',
      'prefer-const': 'error',
      'one-var': ['error', 'never'],
      'no-multi-assign': 'error',
      'no-underscore-dangle': 'error',
      'no-label-var': 'error',
      'symbol-description': 'error',
      'prefer-destructuring': [
        'error',
        {
          VariableDeclarator: {
            array: false,
            object: true,
          },
          AssignmentExpression: {
            array: true,
            object: false,
          },
        },
        {
          enforceForRenamedProperties: false,
        },
      ],

      // ---------- Airbnb: 函数 ----------
      'prefer-arrow-callback': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'func-names': 'warn',
      'no-new-func': 'error',
      'no-loop-func': 'error',
      'consistent-return': 'off',
      'array-callback-return': ['error', { allowImplicit: true }],
      'no-param-reassign': ['error', { props: false }],

      // ---------- Airbnb: 对象、字符串、模块 ----------
      'object-shorthand': [
        'error',
        'always',
        {
          ignoreConstructors: false,
          avoidQuotes: true,
        },
      ],
      'no-useless-computed-key': 'error',
      'no-useless-rename': 'error',
      'prefer-object-spread': 'error',
      'prefer-template': 'error',
      'no-useless-concat': 'error',
      'no-useless-escape': 'error',
      'no-template-curly-in-string': 'error',
      'no-duplicate-imports': 'error',

      // ---------- Airbnb: 条件与控制流 ----------
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'multi-line'],
      'no-else-return': ['error', { allowElseIf: false }],
      'no-lonely-if': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': ['error', { defaultAssignment: false }],
      'no-return-assign': ['error', 'always'],
      'no-useless-return': 'error',
      'no-continue': 'error',
      'no-await-in-loop': 'error',
      'no-bitwise': 'error',
      'no-sequences': 'error',
      'no-self-compare': 'error',
      'default-case': ['error', { commentPattern: '^no default$' }],
      'default-case-last': 'error',
      'guard-for-in': 'error',
      'dot-notation': 'error',
      yoda: 'error',
      radix: 'error',
      'operator-assignment': ['error', 'always'],

      // Airbnb 默认禁用 ++ 和 for...of，争议较大，不想要可以删掉对应行
      'no-plusplus': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForInStatement',
          message: 'for..in 会遍历原型链，请改用 Object.keys / Object.entries。',
        },
        {
          selector: 'ForOfStatement',
          message: 'for..of 在 Airbnb 中被禁用，请改用数组方法。',
        },
        {
          selector: 'LabeledStatement',
          message: '不要使用 label。',
        },
        {
          selector: 'WithStatement',
          message: '不要使用 with。',
        },
      ],

      // ---------- Airbnb: 安全与调试 ----------
      'no-console': 'warn',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-script-url': 'error',
      'no-extend-native': 'error',
      'no-new-wrappers': 'error',
      'prefer-promise-reject-errors': ['error', { allowEmptyReject: true }],

      // ---------- Airbnb 中需要换成 TS 版本的规则 ----------
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: true,
          classes: true,
          variables: true,
        },
      ],
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: false,
          allowTernary: false,
          allowTaggedTemplates: false,
        },
      ],
      'no-useless-constructor': 'off',
      '@typescript-eslint/no-useless-constructor': 'error',

      // ---------- 命名（对应 Airbnb 的命名约定） ----------
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
      ],

      // ---------- 空行规则（你之前提到的需求） ----------
      'padding-line-between-statements': [
        'warn',
        {
          blankLine: 'always',
          prev: '*',
          next: ['if', 'for', 'while', 'switch', 'try', 'return', 'throw'],
        },
        {
          blankLine: 'always',
          prev: ['if', 'for', 'while', 'switch', 'try'],
          next: '*',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: ['function', 'class', 'export'],
        },
        {
          blankLine: 'always',
          prev: ['function', 'class'],
          next: '*',
        },
        {
          blankLine: 'always',
          prev: ['multiline-const', 'multiline-expression'],
          next: '*',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: ['multiline-const', 'multiline-expression'],
        },
        {
          blankLine: 'any',
          prev: ['const', 'let'],
          next: ['const', 'let'],
        },
      ],
      'lines-around-comment': 'off',
      '@stylistic/lines-around-comment': [
        'warn',
        {
          beforeLineComment: true,
          beforeBlockComment: true,
          allowBlockStart: true,
          allowObjectStart: true,
          allowArrayStart: true,
          allowClassStart: true,
          allowInterfaceStart: true,
          allowTypeStart: true,
          allowEnumStart: true,
          allowModuleStart: true,
        },
      ],
    },
  },
);
