// English dictionary
import type { zh } from './zh';

export const en: Record<keyof typeof zh, string> = {
  // Common
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'common.back': 'Back',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.save': 'Save',
  'common.close': 'Close',
  'common.viewMore': 'View More',

  // Navigation
  'nav.home': 'Home',
  'nav.survey': 'Start Test',
  'nav.recommendations': 'Recommendations',
  'nav.favorites': 'Favorites',
  'nav.language': '中 | EN',

  // Home - Nav
  'home.nav.viewRecommendations': 'View Recommendations',
  'home.nav.retakeTest': 'Retake Test',
  'home.nav.startTest': 'Start Test',

  // Home - Hero
  'home.hero.badge': 'AI Smart Outfit Recommendations',
  'home.hero.welcomeBack': 'Welcome Back',
  'home.hero.subtitle': 'AI Smart Outfit Recommendations',
  'home.hero.title1': 'Find Your Perfect',
  'home.hero.title2': 'Style',
  'home.hero.desc': 'AI generates personalized outfit recommendations based on your body type, skin tone, and style preferences',
  'home.hero.cta': 'Start My Style Test',
  'home.hero.returnCta': 'View My Recommendations',
  'home.hero.retest': 'Retake Test',
  'home.hero.viewMyRecommendations': 'View My Recommendations',
  'home.hero.retakeTest': 'Retake Test',
  'home.hero.startTestNow': 'Start Test Now',
  'home.hero.returnHint': 'We found your previous test results. View recommendations now',

  // Home - Weather Card
  'home.weather.title': "Today's Weather",
  'home.weather.loading': 'Loading weather...',
  'home.weather.defaultLocation': 'Default: Shanghai',
  'home.weather.feelsLike': 'Feels',
  'home.weather.clickRefresh': 'Click to refresh',
  'home.weather.refreshing': 'Refreshing...',

  // Home - Occasion Quick Entry
  'home.occasions.title': "Where Today?",
  'home.occasions.subtitle': 'Pick an occasion, get instant outfits',
  'home.occasions.work.title': 'Work',
  'home.occasions.work.desc': 'Professional and confident',
  'home.occasions.date.title': 'Date',
  'home.occasions.date.desc': 'Charming and impressive',
  'home.occasions.sport.title': 'Fitness',
  'home.occasions.sport.desc': 'Comfortable and active',
  'home.occasions.party.title': 'Party',
  'home.occasions.party.desc': 'Trendy and eye-catching',
  'home.occasions.travel.title': 'Travel',
  'home.occasions.travel.desc': 'Casual and versatile',
  'home.occasions.formal.title': 'Formal',
  'home.occasions.formal.desc': 'Elegant and sophisticated',

  // Home - Steps
  'home.steps.title': '3 Steps to Your Style',
  'home.steps.subtitle': 'Simple steps to personalized style',
  'home.steps.step1.title': 'Body Info',
  'home.steps.step1.desc': 'Height, weight, body type in 30 seconds',
  'home.steps.step2.title': 'AI Matching',
  'home.steps.step2.desc': 'AI analyzes the best outfits for you',
  'home.steps.step3.title': 'Get Recommendations',
  'home.steps.step3.desc': 'View personalized picks, buy with one click',

  // Home - Features
  'home.features.title': 'Why StyleFit',
  'home.features.ai.title': 'AI Smart Recommendations',
  'home.features.ai.desc': 'AI precisely matches outfits based on your body, skin tone, and style',
  'home.features.weather.title': 'Weather Aware',
  'home.features.weather.desc': 'Real-time weather integration for temperature-appropriate outfits',
  'home.features.occasion.title': 'Occasion Match',
  'home.features.occasion.desc': 'Work, date, gym, party — different occasions, different outfits',
  'home.features.personal.title': 'Personalized',
  'home.features.personal.desc': 'Every recommendation is tailored for you, not generic templates',
  'home.features.quality.title': 'Quality Guarantee',
  'home.features.quality.desc': 'All items are carefully selected for quality and style',

  // Home - CTA
  'home.cta.title': 'Ready to find your style?',
  'home.cta.desc': 'Start your style test now and discover your perfect outfits',
  'home.cta.button': 'Start Test',

  // Home - Footer
  'home.footer.tagline': 'AI Smart Outfit Recommendations',

  // Survey - Steps
  'survey.step.basic': 'Basic Info',
  'survey.step.body': 'Body Analysis',
  'survey.step.style': 'Style Preference',
  'survey.step.result': 'Results',

  // Survey - Step 0: Basic Info
  'survey.basic.title': 'Basic Info',
  'survey.basic.subtitle': 'Tell us about yourself',
  'survey.basic.gender': 'Gender',
  'survey.basic.male': 'Male',
  'survey.basic.female': 'Female',
  'survey.basic.height': 'Height (cm)',
  'survey.basic.heightHint': 'Enter height between 80-220',
  'survey.basic.weight': 'Weight (kg)',
  'survey.basic.weightHint': 'Enter weight between 20-200',
  'survey.basic.age': 'Age (optional)',
  'survey.basic.ageHint': '18-80 years old for better recommendations',
  'survey.basic.budget': 'Budget per item (optional)',
  'survey.basic.budgetHint': '50-10000 CNY',
  'survey.basic.budgetUnit': 'CNY',

  // Survey - Step 1: Body Analysis
  'survey.body.title': 'Body Analysis',
  'survey.body.subtitle': 'Help us understand your body better',
  'survey.body.type': 'Body Type',
  'survey.body.skinTone': 'Skin Tone',
  'survey.body.measurements': 'Measurements (optional)',
  'survey.body.measurementsHint': 'Fill in for more accurate recommendations',
  'survey.body.shoulder': 'Shoulder (cm)',
  'survey.body.waist': 'Waist (cm)',
  'survey.body.hip': 'Hip (cm)',

  // Survey - Body Types
  'survey.bodyType.slim': 'Slim',
  'survey.bodyType.slimDesc': 'Narrow shoulders, slender overall',
  'survey.bodyType.standard': 'Standard',
  'survey.bodyType.standardDesc': 'Balanced proportions',
  'survey.bodyType.athletic': 'Athletic',
  'survey.bodyType.athleticDesc': 'Broad shoulders, defined muscles',
  'survey.bodyType.curvy': 'Curvy',
  'survey.bodyType.curvyDesc': 'Defined waist-hip ratio',
  'survey.bodyType.plus': 'Plus',
  'survey.bodyType.plusDesc': 'Larger frame or fuller figure',

  // Survey - Skin Tones
  'survey.skinTone.fair': 'Fair',
  'survey.skinTone.light': 'Light',
  'survey.skinTone.medium': 'Medium',
  'survey.skinTone.tan': 'Tan',
  'survey.skinTone.dark': 'Dark',

  // Survey - Step 2: Style Preference
  'survey.style.title': 'Style Preference',
  'survey.style.subtitle': 'Choose your preferred style',
  'survey.style.preference': 'Style',
  'survey.style.occasion': 'Main Occasion',
  'survey.style.season': 'Current Season',

  // Survey - Style Options
  'survey.style.casual': 'Casual',
  'survey.style.casualDesc': 'Comfortable everyday wear',
  'survey.style.business': 'Business',
  'survey.style.businessDesc': 'Professional and polished',
  'survey.style.streetwear': 'Streetwear',
  'survey.style.streetwearDesc': 'Trendy and expressive',
  'survey.style.minimal': 'Minimal',
  'survey.style.minimalDesc': 'Less is more, premium quality',
  'survey.style.elegant': 'Elegant',
  'survey.style.elegantDesc': 'Refined and sophisticated',
  'survey.style.sporty': 'Sporty',
  'survey.style.sportyDesc': 'Active and energetic',

  // Survey - Occasion Options
  'survey.occasion.daily': 'Daily',
  'survey.occasion.work': 'Work',
  'survey.occasion.date': 'Date',
  'survey.occasion.party': 'Party',
  'survey.occasion.travel': 'Travel',
  'survey.occasion.formal': 'Formal',

  // Survey - Season Options
  'survey.season.spring': 'Spring',
  'survey.season.summer': 'Summer',
  'survey.season.autumn': 'Autumn',
  'survey.season.winter': 'Winter',

  // Survey - Buttons
  'survey.next': 'Next',
  'survey.prev': 'Previous',
  'survey.submit': 'Generate My Outfits',
  'survey.submitting': 'AI Analyzing...',

  // Survey - Validation
  'survey.error.heightRange': 'Height must be between 80-220cm',
  'survey.error.weightRange': 'Weight must be between 20-200kg',

  // Recommendations - Navbar
  'rec.nav.title': 'Your Recommendations',
  'rec.nav.changeOccasion': 'Change Occasion',
  'rec.nav.fillSurvey': 'Fill survey for better recommendations',
  'rec.nav.fillSurveyCta': 'Take Survey',

  // Recommendations - Occasion Labels
  'rec.occasion.work': 'Work',
  'rec.occasion.date': 'Date',
  'rec.occasion.daily': 'Fitness',
  'rec.occasion.party': 'Party',
  'rec.occasion.travel': 'Travel',
  'rec.occasion.formal': 'Formal',
  'rec.occasion.todayAt': 'Today: ',

  // Recommendations - Weather Bar
  'rec.weather.today': 'Today',
  'rec.weather.feelsLike': 'Feels',
  'rec.weather.defaultLocation': 'Using Shanghai weather',
  'rec.weather.hotTip': 'Light and breathable outfits',
  'rec.weather.coldTip': 'Stay warm',
  'rec.weather.rainTip': 'Bring an umbrella',

  // Recommendations - Match Score
  'rec.match.score': 'Match',
  'rec.match.reason': 'Why recommended',

  // Recommendations - Outfit Card
  'rec.outfit.items': 'Items',
  'rec.outfit.stylingAdvice': 'Styling Tips',
  'rec.outfit.buyAll': 'Buy All',
  'rec.outfit.buy': 'Buy Now',
  'rec.outfit.price': 'Price',
  'rec.outfit.brand': 'Brand',

  // Recommendations - Category Filter
  'rec.category.all': 'All',
  'rec.category.top': 'Tops',
  'rec.category.bottom': 'Bottoms',
  'rec.category.dress': 'Dresses',
  'rec.category.outerwear': 'Outerwear',
  'rec.category.shoes': 'Shoes',
  'rec.category.accessory': 'Accessories',

  // Recommendations - No Profile
  'rec.noProfile.title': 'No body data yet',
  'rec.noProfile.desc': 'Take the survey for more accurate recommendations',
  'rec.noProfile.cta': 'Take Test',

  // Recommendations - No Results
  'rec.noResults.title': 'No recommendations yet',
  'rec.noResults.desc': 'Try adjusting filters or regenerate',

  // Favorites
  'fav.title': 'My Favorites',
  'fav.empty.title': 'No favorites yet',
  'fav.empty.desc': 'Browse recommendations and heart items you love',
  'fav.empty.cta': 'View Recommendations',
  'fav.empty.backHome': 'Back to Home',
  'fav.viewAll': 'View All',
  'fav.remove': 'Remove',
  'fav.items': 'items',

  // 404
  'notfound.title': 'Page Not Found',
  'notfound.desc': 'The page you are looking for does not exist or has been removed.',
  'notfound.backHome': 'Back to Home',
  'notfound.backPrev': 'Go Back',

  // Weather - Labels
  'weather.clear': 'Clear',
  'weather.cloudy': 'Cloudy',
  'weather.overcast': 'Overcast',
  'weather.fog': 'Fog',
  'weather.drizzle': 'Drizzle',
  'weather.rain': 'Rain',
  'weather.heavyRain': 'Heavy Rain',
  'weather.snow': 'Snow',
  'weather.sleet': 'Sleet',
  'weather.shower': 'Shower',
  'weather.thunderstorm': 'Thunderstorm',
  'weather.unknown': 'Unknown',

  // Weather - Thickness Tiers
  'weather.tier.hot': 'Hot',
  'weather.tier.warm': 'Warm',
  'weather.tier.comfortable': 'Comfortable',
  'weather.tier.cool': 'Cool',
  'weather.tier.cold': 'Cold',
  'weather.tier.freezing': 'Freezing',

  // Weather - Advice Templates
  'weather.advice.hot': 'Light and breathable outfits',
  'weather.advice.warm': 'Thin and breathable outfits',
  'weather.advice.comfortable': 'Light layers work well',
  'weather.advice.cool': 'Hoodies and jackets recommended',
  'weather.advice.cold': 'Stay warm with sweaters and coats',
  'weather.advice.freezing': 'Freezing weather, dress warmly',
  'weather.advice.rain': 'Bring umbrella, waterproof shoes',
  'weather.advice.wind': 'Windy, add windproof layer',

  // Match Reasons - Templates
  'match.reason.bodyType': 'Suitable for {bodyType} body type',
  'match.reason.style': 'Matches {style} style',
  'match.reason.occasion': 'Good for {occasion} occasions',
  'match.reason.season': 'Suitable for {season}',
  'match.reason.weather': 'Today {temp}°C, {advice}',
  'match.reason.skinTone': 'Complements {skinTone} skin tone',

  // Match Reasons - Body Type Labels
  'match.bodyType.slim': 'slim',
  'match.bodyType.standard': 'standard',
  'match.bodyType.athletic': 'athletic',
  'match.bodyType.curvy': 'curvy',
  'match.bodyType.plus': 'plus',

  // Match Reasons - Style Labels
  'match.style.casual': 'casual',
  'match.style.business': 'business',
  'match.style.streetwear': 'streetwear',
  'match.style.minimal': 'minimal',
  'match.style.elegant': 'elegant',
  'match.style.sporty': 'sporty',

  // Match Reasons - Skin Tone Labels
  'match.skinTone.fair': 'fair',
  'match.skinTone.light': 'light',
  'match.skinTone.medium': 'medium',
  'match.skinTone.tan': 'tan',
  'match.skinTone.dark': 'dark',

  // Common
  'common.favorites': 'Favorites',

  // Favorites
  'favorites.title': 'My Favorites',
  'favorites.subtitle': 'Your saved clothing items',
  'favorites.empty': 'No favorites yet',
  'favorites.emptyDesc': 'Go to recommendations and save your favorite items',
  'favorites.goToRecommendations': 'View Recommendations',
  'favorites.unfavorite': 'Unfavorite',
  'favorites.backToRecommendations': 'Back to Recommendations',
  'favorites.count': '{{count}} items',
  'favorites.empty.title': 'No favorites yet',
  'favorites.empty.desc': 'Go to recommendations and save your favorite items',
  'favorites.empty.button': 'View Recommendations',

  // NotFound
  'notFound.title': 'Page Not Found',
  'notFound.desc': 'The page you are looking for does not exist or has been moved',
  'notFound.backHome': 'Back to Home',
  'notFound.goBack': 'Go Back',

  // Home - Features (additional)
  'home.features.feature1.title': 'AI Smart Match',
  'home.features.feature1.desc': 'Intelligently recommends the best outfits based on your body data and style preferences',
  'home.features.feature2.title': 'Weather Aware',
  'home.features.feature2.desc': 'Get real-time weather data and recommend suitable outfits based on temperature and conditions',
  'home.features.feature3.title': 'Occasion Adaptation',
  'home.features.feature3.desc': 'Recommend the best outfits for different occasions like work, dates, sports, etc.',
  'home.features.feature4.title': 'Favorites Management',
  'home.features.feature4.desc': 'Save your favorite items for easy viewing and comparison',
};
