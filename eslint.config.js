import neostandard from 'neostandard'

const eslint = neostandard({
  ignores: ['.public/**']
})

for (const item of eslint) {
  if (item?.languageOptions?.ecmaVersion < 2025) {
    item.languageOptions.ecmaVersion = 2025
  }
}

export default eslint
