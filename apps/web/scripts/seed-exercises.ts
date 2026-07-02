import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedExercises() {
  console.log('🌱 Seeding exercises from dataset...')

  const datasetPath = path.join(process.cwd(), 'exercises-dataset.json')
  
  if (!fs.existsSync(datasetPath)) {
    console.error('exercises-dataset.json not found. Please download it first:')
    console.error('  curl -L https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json -o exercises-dataset.json')
    process.exit(1)
  }

  const rawData = fs.readFileSync(datasetPath, 'utf-8')
  const exercises = JSON.parse(rawData)

  console.log(`Found ${exercises.length} exercises in dataset`)

  // Transform to our schema based on actual dataset structure
  const transformed = exercises.map((ex: any) => ({
    name: ex.name,
    category: ex.category,
    primary_muscles: ex.target ? [ex.target] : [],
    secondary_muscles: ex.secondary_muscles || [],
    equipment: ex.equipment ? [ex.equipment] : [],
    force_type: null,
    mechanic_type: null,
    difficulty: 'beginner',
    instructions: ex.instructions?.en || null,
    video_url: null,
    image_url: ex.gif_url || ex.image || null,
  }))

  // Insert in batches
  const batchSize = 100
  let inserted = 0
  let errors = 0

  for (let i = 0; i < transformed.length; i += batchSize) {
    const batch = transformed.slice(i, i + batchSize)
    
    const { data, error } = await supabase
      .from('exercises')
      .upsert(batch, { onConflict: 'name' })
      .select()

    if (error) {
      console.error(`Batch ${i / batchSize + 1} error:`, error.message)
      errors += batch.length
    } else {
      inserted += data?.length || 0
      console.log(`Batch ${i / batchSize + 1}: inserted ${data?.length || 0} exercises`)
    }
  }

  console.log(`\n✅ Seeding complete!`)
  console.log(`   Inserted/updated: ${inserted}`)
  console.log(`   Errors: ${errors}`)
}

seedExercises().catch(console.error)