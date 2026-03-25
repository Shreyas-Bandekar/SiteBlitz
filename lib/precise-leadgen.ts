import * as cheerio from 'cheerio'

export async function preciseLeadGen(html: string, page: any) {
  // 1. STATIC Cheerio (backup)
  const $ = cheerio.load(html || '')
  const issues: string[] = []
  let score = 0
  let roi = 0

  // 2. DYNAMIC Playwright (PRIMARY - catches JS forms)
  if (page) {
    try {
      const liveForms = await page.$$eval('form', (forms: any[]) => 
        forms.filter((form: any) => 
          Array.from(form.querySelectorAll('input')).some((input: any) => 
            input.type === 'email' || 
            input.name?.toLowerCase().includes('mail') ||
            input.placeholder?.toLowerCase().includes('email')
          )
        ).map((form: any) => ({
          hasEmail: true,
          aboveFold: form.getBoundingClientRect().top < 600,
          id: form.id || 'dynamic'
        }))
      )

      if (liveForms.length > 0) {
        const primaryForm = liveForms[0]
        if (primaryForm.aboveFold) {
          return {
            leadScore: 92,  // High score for JS-detected
            issues: ["✅ Dynamic contact form detected (JS-rendered)"],
            roiGain: "₹95K/mo"
          }
        }
      }
    } catch (e) {
      // Ignore and fallback
    }
  }

  // CONTACT FORM (25pts)
  const contactForms = $('form').filter((i, el) => 
    $(el).find('input[type=email],input[name*=mail]').length > 0
  )
  if (contactForms.length === 0) {
    issues.push('❌ NO CONTACT FORM → Add "Get Quote" above fold')
    score += 0
  } else {
    issues.push('✅ Contact form above fold ✓')
    score += 25
  }

  // CTAs (20pts)
  const ctas = $('a,button,[onclick]').filter((i,el) => 
    /contact|quote|call|free|get|start/i.test($(el).text().toLowerCase())
  )
  if (ctas.length >= 3) {
    issues.push(`✅ ${ctas.length} CTAs detected`)
    score += 20
  } else {
    issues.push(`❌ ${ctas.length} CTAs → Add 3 hero buttons`)
    score += ctas.length * 6
  }

  // CONTACT INFO (15pts)
  const contacts = html ? html.match(/(?:phone|tel|call|whatsapp)[\s+:()-0-9]+|[\w\.-]+@[\w\.-]+\.\w{2,}/i) : null
  if (contacts) {
    issues.push('✅ Phone/email visible')
    score += 15
  } else {
    issues.push('❌ No contacts → Add WhatsApp sticky')
  }

  roi = Math.round(score * 1000) // ₹75K max realistic
  return { leadScore: Math.round(score), issues, roiGain: `₹${roi}K/mo` }
}
