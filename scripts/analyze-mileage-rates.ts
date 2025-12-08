import { getSimplicateClient } from '../src/lib/simplicate/client'

async function analyzeRates() {
  try {
    const client = getSimplicateClient()
    console.log('Fetching mileage data to analyze rates...\n')
    
    const mileage = await client.getAllMileage()
    
    console.log(`Total entries: ${mileage.length}\n`)
    
    // Analyze rates
    const ratesMap = new Map<number, number>()
    const entriesWithoutRate: any[] = []
    
    for (const entry of mileage) {
      if (entry.tariff) {
        ratesMap.set(entry.tariff, (ratesMap.get(entry.tariff) || 0) + 1)
      } else {
        entriesWithoutRate.push({
          id: entry.id,
          date: entry.start_date,
          km: entry.mileage,
          project: entry.project?.name
        })
      }
    }
    
    console.log('Rate distribution:')
    Array.from(ratesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([rate, count]) => {
        console.log(`  €${rate}/km: ${count} entries (${((count/mileage.length)*100).toFixed(1)}%)`)
      })
    
    console.log(`\nEntries without rate: ${entriesWithoutRate.length}`)
    if (entriesWithoutRate.length > 0 && entriesWithoutRate.length <= 10) {
      console.log('\nSample entries without rate:')
      entriesWithoutRate.forEach(e => console.log(`  - ${e.date}: ${e.km}km for ${e.project}`))
    }
    
    // Sample entries with rates
    console.log('\n\nSample entries with rates:')
    mileage.slice(0, 5).forEach(e => {
      console.log(`  ${e.start_date}: ${e.mileage}km @ €${e.tariff || 'NO RATE'}/km = €${(e.mileage * (e.tariff || 0)).toFixed(2)} (${e.project?.name})`)
    })
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
  }
}

analyzeRates()
