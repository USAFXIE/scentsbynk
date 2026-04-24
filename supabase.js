const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = "https://bigzgqdrjpoxrodvrzem.supabase.co"
const supabaseKey = "sb_publishable_Zfz0VMPHmJbc9jVLeun4lw_N6MTafpM"

const supabase = createClient(supabaseUrl, supabaseKey)

module.exports = supabase