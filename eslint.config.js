import neostandard from 'neostandard'

const eslint = neostandard({
  ignores: ['.public/**']
})

for (const item of eslint) {
  if (item?.languageOptions?.ecmaVersion < 2025) {
    item.languageOptions.ecmaVersion = 2025
  }
}

eslint.push({
  rules: {
    curly: ['error', 'all']
  }
})

export default eslint
