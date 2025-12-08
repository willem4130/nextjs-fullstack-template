import { getSimplicateClient } from '../src/lib/simplicate/client'

async function testMileageAPI() {
  try {
    const client = getSimplicateClient()
    console.log('Fetching mileage data from Simplicate API...')
    
    const mileage = await client.getMileage({ limit: 5 })
    
    console.log(`\n✅ Received ${mileage.length} mileage entries\n`)
    console.log('Sample entry structure:')
    console.log(JSON.stringify(mileage[0], null, 2))
    
    console.log('\n\nAll entry keys:')
    if (mileage[0]) {
      console.log(Object.keys(mileage[0]).sort())
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
  }
}

testMileageAPI()
