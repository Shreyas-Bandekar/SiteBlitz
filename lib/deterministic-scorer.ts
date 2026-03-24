import seedrandom from 'seedrandom'
import crypto from 'crypto'
import * as cheerio from 'cheerio'

export async function stableAudit(url: string, html: string, page: any, kv: any, lighthouse: any) {
  const seed = crypto.createHash('sha256').update(url).digest('hex')
  const rng = seedrandom(seed)
  const issues: string[] = []
  
  // CACHED LIGHTHOUSE (5min TTL)
  const cacheKey = `lighthouse:${seed.slice(0,16)}`
  let lh = null
  if (kv) {
    lh = await kv.get(cacheKey)
    if (!lh && lighthouse) {
      lh = await lighthouse(url) // Your existing
      await kv.set(cacheKey, lh, {ex: 300})
    }
  }
  
  // MANUAL UX SCORE (100% deterministic)
  const $ = cheerio.load(html || '')
  let uxScore = 100
  const tinyFonts = $('*').filter((i,e) => parseFloat($(e).css('font-size') || '16') < 14).length
  if (tinyFonts > 3) uxScore -= 15, issues.push(`Tiny fonts (${tinyFonts}) → Use 16px min`)
  
  const contrasts = page ? await page.evaluate(() => {
    // Simple contrast check on 10 text elements
    
    // helper func to get luminance
    function luminance(colorString: string) {
       const rgb = colorString.match(/\d+/g);
       if (!rgb || rgb.length < 3) return 1;
       const a = [parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2])].map(function (v) {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
       });
       return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
    
    return Array.from(document.querySelectorAll('p,h1,h2')).map(el => {
      const style = getComputedStyle(el)
      return (luminance(style.color) + 0.05) / (luminance(style.backgroundColor) + 0.05)
    }).filter(c => c < 4.5 && c > 0)
  }) : []
  
  if (contrasts.length > 3) uxScore -= 20, issues.push('Low contrast → AA compliant 4.5:1')
  
  // NAVIGATION
  const navDepth = $('nav *').length
  if (navDepth > 12) uxScore -= 10, issues.push('Complex nav → Simplify to 8 items')
  
  return { uxScore: Math.round(uxScore), issues }
}
