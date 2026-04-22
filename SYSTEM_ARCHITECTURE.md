# EDUNOX - Smart Learning Platform
## Complete System Implementation & Architecture

### 🎯 Project Overview
**Edunox** is a comprehensive AI-powered learning platform that combines:
- **Smart Study Timer** with auto-pause/resume detection
- **AI Tutor** for personalized learning assistance
- **PDF Material Processing** with RAG (Retrieval-Augmented Generation)
- **Quiz Generation** with AI-powered questions
- **Analytics & Performance Tracking** for learning insights
- **Gamification** with XP, streaks, and leaderboards

---

## 📋 Four-Agent Collaborative Implementation

### **Agent 1: Frontend & Timer Engineer** ✅ COMPLETE
**Responsibilities & Deliverables:**
- ✅ Enhanced GlobalTimer component with visibilitychange API
- ✅ Auto-pause on tab switch, minimize, or inactivity
- ✅ Auto-resume when user returns to active tab
- ✅ localStorage persistence for crash recovery (10-second backups)
- ✅ Created comprehensive TimerPage component
- ✅ Fixed AuthContext to provide `session` property
- ✅ Timer data recovery on page refresh

**Implementation Files:**
- `src/components/GlobalTimer.tsx` - Enhanced with visibility API & localStorage
- `src/pages/timer/TimerPage.tsx` - Complete timer dashboard with statistics
- `src/contexts/AuthContext.tsx` - Fixed to provide session property
- `src/App.tsx` - Added timer route integration

**How Timer Works:**
1. Auto-starts when user logs in (dashboard loads)
2. Detects tab visibility changes (visibilitychange event)
3. Pauses automatically when:
   - User switches tabs
   - Browser is minimized
   - Window loses focus
4. Resumes automatically when user returns
5. Saves session to Firestore (minimum 5 seconds to save)
6. Backs up to localStorage every 10 seconds
7. Recovers from localStorage on page refresh

**XP Calculation:**
- 5 XP per minute of study
- Minimum 5 seconds to qualify for saving
- XP logged in `xp_logs` collection

### **Agent 2: Backend & AI Functions** ✅ COMPLETE
**Responsibilities & Deliverables:**
- ✅ Comprehensive backend API documentation
- ✅ API integration layer with error handling & retries
- ✅ Streaming support for real-time AI responses
- ✅ Mock implementations for development
- ✅ Function specifications for 4 core backend services

**Four Core Backend Functions:**

#### 1. **process-material** 
- Uploads PDF materials for learning
- Extracts text content
- Generates embeddings and chunks
- Creates searchable knowledge base
- Returns: Material metadata, summary, key topics

#### 2. **query-material**
- Q&A on uploaded materials using RAG
- Vector search + context retrieval
- AI-powered answers with material references
- Streaming responses for smooth UX

#### 3. **solve-doubt**
- General AI question answering
- Subject-aware responses
- Step-by-step explanations
- Streaming responses

#### 4. **generate-quiz**
- AI-powered quiz generation
- Customizable difficulty levels
- Multiple question types (MCQ, short answer)
- Detailed explanations for each answer

**Implementation Files:**
- `src/lib/backend-api-docs.ts` - Detailed API specifications
- `src/lib/backend-api.ts` - Integration layer with streaming support
- `src/lib/supabase.ts` - Minimal Supabase client (no external dependencies)

**How to Deploy Backend:**

**Option A: Supabase Edge Functions (Recommended)**
```bash
npm install -g supabase
supabase functions deploy
# Set environment variables in Supabase dashboard
```

**Option B: Firebase Cloud Functions**
```bash
npm install -g firebase-tools
firebase init functions
firebase deploy --only functions
```

**Required Environment Variables:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

### **Agent 3: QA & Bug Detection** ✅ COMPLETE
**Responsibilities & Deliverables:**
- ✅ Fixed Supabase integration across 8 files
- ✅ Uncommented and corrected all API imports
- ✅ Created minimal Supabase client (no external dependencies)
- ✅ Fixed TypeScript deprecation warning
- ✅ Zero compilation errors

**Files Fixed:**
1. `src/pages/doubts/DoubtSession.tsx` - Supabase import
2. `src/pages/doubts/DoubtHistory.tsx` - Supabase import
3. `src/pages/quiz/QuizResults.tsx` - Supabase import
4. `src/pages/materials/AILearning.tsx` - Supabase import
5. `src/pages/materials/AITutor.tsx` - Supabase import
6. `src/pages/materials/MaterialUpload.tsx` - Supabase import
7. `src/pages/Profile.tsx` - Supabase import
8. `src/pages/social/Achievements.tsx` - Supabase import
9. `src/pages/social/Leaderboard.tsx` - Supabase import
10. `tsconfig.app.json` - Added ignoreDeprecations flag

**Testing Checklist:**
- ✅ No TypeScript errors
- ✅ Vite dev server runs without errors
- ✅ All imports resolve correctly
- ✅ Mock API fallbacks work
- ✅ Error boundaries functional

### **Agent 4: Performance & Analytics** ✅ COMPLETE
**Responsibilities & Deliverables:**
- ✅ Firestore schema design with 7 core collections
- ✅ Analytics queries for study time, XP, streaks
- ✅ Productivity scoring algorithm (0-100)
- ✅ Learning insights system
- ✅ Leaderboard functionality
- ✅ Daily analytics snapshots
- ✅ Comprehensive documentation

**Firestore Collections:**

1. **study_sessions** - Individual study records
   - Tracks duration, pause count, interruptions
   - Linked to XP and streak updates

2. **xp_logs** - XP award history
   - Source type tracking (study, quiz, lesson, etc.)
   - For revenue/engagement analytics

3. **user_streaks** - Daily study streak tracking
   - Current, longest streak
   - Last study date for consistency

4. **profiles** - User profile & aggregated stats
   - Total XP, level, study hours
   - User metadata

5. **quiz_results** - Quiz attempt records
   - Score, duration, completion time
   - For weak subject identification

6. **analytics_snapshots** - Daily aggregation
   - Efficient daily queries
   - Trend analysis data

7. **user_preferences** - Learning preferences
   - Study goals, subjects, difficulty
   - UI preferences

**Productivity Score Components:**
- **Consistency (30%)**: Streaks + regularity
- **Activity (40%)**: Study time vs goals
- **Performance (30%)**: Quiz scores
- **Trend**: Improving/stable/declining indicator

**Implementation Files:**
- `src/lib/analytics.ts` - Complete analytics system
- Analytics queries pre-built in useDashboardData.ts
- ProgressDashboard component with charts

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or bun
- Firebase account (auth, Firestore, Storage)
- Supabase account (optional, for edge functions)

### Installation
```bash
cd d:\edunox90-main
npm install
npm run dev
```

### Application URLs
- **Local:** http://localhost:5000/
- **Network:** http://10.74.155.180:5000/
- **Network:** http://172.23.64.1:5000/

### First Time Setup
1. Sign up or log in with Firebase Auth
2. Complete profile setup (onboarding)
3. Set learning goals
4. Upload PDF materials or start studying
5. View timer, progress, and leaderboard

---

## 📊 Key Features

### Timer System
```
GlobalTimer Component Flow:
┌─ Auto-starts on login
├─ Monitors tab visibility
├─ Pauses on visibility change
├─ Resumes on return
├─ Saves to localStorage every 10s
└─ Persists to Firestore on pause/timeout
```

### Study Session Tracking
- **Automatic Pause Detection**: Uses `visibilitychange` API
- **Data Persistence**: Dual storage (localStorage + Firestore)
- **Crash Recovery**: Recovers from localStorage on page refresh
- **XP Award**: 5 XP per minute automatically calculated
- **Streak Tracking**: Daily streaks with longest streak record

### Analytics System
```
User Study Data
      ↓
Daily Aggregation (analytics_snapshots)
      ↓
Productivity Scoring (0-100)
      ↓
Insights & Recommendations
      ↓
Dashboard Visualization
```

### Backend Integration
```
Frontend Request
      ↓
Authentication Check
      ↓
Retry Logic + Backoff
      ↓
Stream Processing (if applicable)
      ↓
Response Handling
      ↓
Error Fallback (Mock APIs)
```

---

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file:
```env
# Firebase
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Supabase (Optional for edge functions)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

### Feature Flags
- Pricing page: Set `isPricingEnabled` in `src/lib/featureFlags.ts`
- Deep Focus mode: Available in user menu
- Admin panel: Only for admin/super_admin roles

---

## 📱 Pages & Routes

### Public Routes
- `/` - Landing page
- `/about` - About Edunox
- `/pricing` - Pricing plans (feature-gated)
- `/login` - Sign in page
- `/signup` - Registration page

### Protected Routes (Requires Authentication)
- `/dashboard` - Main learning dashboard
- `/timer` - Study timer with history
- `/quiz` - Quiz taking interface
- `/materials` - PDF material management
- `/progress` - Learning analytics & insights
- `/doubts` - Q&A system
- `/leaderboard` - Global rankings
- `/profile` - User profile
- `/settings` - User preferences

### Admin Routes
- `/admin` - Admin panel (admin/super_admin only)

---

## 🧪 Testing the Application

### Test User Credentials
Create a test Firebase user or use Google OAuth:
1. Go to http://localhost:5000/signup
2. Create account with email & password
3. Complete onboarding
4. Test study timer
5. Check analytics on dashboard

### Timer Testing
1. Start studying → Timer appears top-right
2. Switch browser tabs → Timer pauses automatically
3. Return to tab → Timer resumes
4. Refresh page → Timer recovers from localStorage
5. Wait 5 seconds of study → Session saves to Firestore

### Analytics Testing
1. Complete multiple study sessions
2. Take quizzes to see performance metrics
3. Visit `/progress` to see analytics
4. Check `/timer` for session history
5. View `/leaderboard` for rankings

---

## 🔐 Security Considerations

### Authentication
- Firebase Auth with email/password + Google OAuth
- Secure JWT token handling
- Protected routes with ProtectedRoute component
- Admin access controlled with AdminRoute

### Data Privacy
- User data isolated by user_id
- Firestore security rules enforce user isolation
- Sensitive data not exposed in client
- API calls include authentication tokens

### Rate Limiting
- Backend functions rate-limited (100 req/min per user)
- Toast notifications for rate limit errors
- Exponential backoff for retries

---

## 📈 Performance Metrics

### Optimizations
- React Query for efficient caching
- Lazy loading for pages
- Error boundaries on major routes
- localStorage for instant recovery
- Analytics snapshots for fast queries
- Firestore pagination with limits

### Monitoring
- Firebase Analytics integrated
- API call logging
- Error tracking via console
- Performance metrics in ProgressDashboard

---

## 🛠️ Maintenance & Deployment

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Check code style
npm run test         # Run tests
```

### Production Deployment
1. Build: `npm run build`
2. Deploy to Vercel:
   ```bash
   vercel deploy
   ```
3. Set environment variables in Vercel dashboard
4. Deploy backend functions (Supabase/Firebase)
5. Verify all routes work

### Database Maintenance
- Monitor Firestore usage & costs
- Archive old study sessions periodically
- Refresh vector embeddings quarterly
- Backup critical user data

---

## 📚 Documentation Files

Core documentation files created:
- `src/lib/backend-api-docs.ts` - Backend API specs
- `src/lib/backend-api.ts` - Integration layer
- `src/lib/analytics.ts` - Analytics system
- `src/lib/studySession.ts` - Session management
- `src/components/GlobalTimer.tsx` - Timer implementation

---

## 🚨 Known Limitations & Future Work

### Current Limitations
- Backend functions (AI processing) require Supabase/Firebase setup
- PDF processing needs vector database (pgvector)
- Email notifications not implemented
- Offline mode not yet supported
- Real-time collaboration not included

### Future Enhancements
1. **Real-time Features**
   - Live collaboration on documents
   - Real-time notifications
   - WebSocket for instant updates

2. **AI Improvements**
   - Fine-tuned models for specific subjects
   - Adaptive difficulty based on performance
   - Personalized learning paths

3. **Social Features**
   - Study groups & collaboration
   - Peer review system
   - Achievement sharing

4. **Mobile App**
   - React Native version
   - Offline study sessions
   - Push notifications

5. **Integrations**
   - LMS system integration
   - Calendar sync
   - Note-taking app sync

---

## 📞 Support & Troubleshooting

### Common Issues

**Q: Timer not saving sessions**
- A: Check Firestore security rules allow user writes
- A: Verify Firebase project ID in env variables
- A: Check browser console for errors

**Q: AI functions returning errors**
- A: Verify Supabase/backend functions deployed
- A: Check API keys in environment variables
- A: Review function logs for details

**Q: Analytics not showing data**
- A: Ensure study sessions have completed
- A: Check Firestore collections exist
- A: Verify user_id matches across collections

**Q: localStorage errors**
- A: Clear browser storage and refresh
- A: Check quota (localStorage has ~5MB limit)
- A: Disable private browsing mode

---

## 🎓 Learning Resources

### For Users
- [Study Tips](https://edunox.example.com/tips) - Effective study techniques
- [FAQ](https://edunox.example.com/faq) - Frequently asked questions
- [Tutorial Videos](https://edunox.example.com/tutorials) - Getting started

### For Developers
- [API Documentation](src/lib/backend-api-docs.ts)
- [Architecture Guide](README.md) - This file
- [Code Comments](src/) - Inline documentation
- [Firebase Docs](https://firebase.google.com/docs)
- [Supabase Docs](https://supabase.com/docs)

---

**Edunox v1.0.0** | Built with React + TypeScript + Firebase + Supabase
