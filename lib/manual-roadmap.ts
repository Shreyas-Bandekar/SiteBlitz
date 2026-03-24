export function generateRoadmap(allIssues: string[], scores: any) {
  const topFixes = allIssues.slice(0,5)
  const totalRoi = 75000 // From leadgen
  
  return {
    summary: `Current ${scores?.overall || 0}/100 → Target 92/100 (+₹${totalRoi}K/mo)`,
    week1: topFixes.slice(0,3).map((issue,i) => `Day ${i*2+1}: ${issue}`),
    week2: topFixes.slice(3,5).map((issue,i) => `Day ${7+i*3}: ${issue}`),
    outcome: `Week 4: ${(scores?.overall || 0) + 25}/100 → 28% lead growth`
  }
}
