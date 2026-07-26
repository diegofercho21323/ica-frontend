import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// A native numeric input hands back a value the browser has already parsed as an
// IEEE-754 double, so '10.10' arrives as '10.1' and any integer past 2^53 is
// rounded. Inventory quantities are exact decimal strings on the wire, so the
// coercion is silent data corruption rather than a formatting preference.
const NUMBER_INPUT_MESSAGE =
  'Do not use <input type="number">: the browser coerces its value to an IEEE-754 float, ' +
  'so exact decimal quantities are silently rewritten ("10.10" becomes "10.1", integers past ' +
  '2^53 are rounded). Use <input type="text" inputMode="decimal"> and validate the raw string.'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // <input type="number" />
          selector:
            "JSXOpeningElement[name.name='input'] JSXAttribute[name.name='type'][value.value='number']",
          message: NUMBER_INPUT_MESSAGE,
        },
        {
          // <input type={'number'} /> — the same element, expressed so the
          // attribute value is a Literal inside an expression container.
          selector:
            "JSXOpeningElement[name.name='input'] JSXAttribute[name.name='type'] > JSXExpressionContainer > Literal[value='number']",
          message: NUMBER_INPUT_MESSAGE,
        },
      ],
    },
  },
)
