// Database replaced by Supabase — see supabase.js
const supabase = require('./supabase')

// Example: get all products
async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')

  if (error) throw error
  return data
}

module.exports = {
  getProducts
}