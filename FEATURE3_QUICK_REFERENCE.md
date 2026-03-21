# Feature 3: LLD/HLD Design Vault - Developer Quick Reference

## 🚀 Quick Commands

### Start Development Servers
```bash
# Terminal 1: Backend
cd Server && npm run dev

# Terminal 2: Frontend  
cd Client && npm run dev
```

### Access Application
```
Frontend: http://localhost:5173
Backend: http://localhost:4000/api/v1
```

---

## 📂 File Structure Reference

```
Backend (Server/src/)
├── models/
│   └── LLDHLDDesign.js          ← Database schema
├── services/
│   └── lldHldService.js         ← Business logic
├── controllers/
│   └── lldHldController.js      ← Request handlers
└── routes/
    └── lldHldRoutes.js          ← API endpoints

Frontend (Client/src/)
├── api/
│   └── lldHldApi.js             ← Axios API functions
└── components/
    ├── LLDHLDVault.jsx          ← Main container
    ├── LLDHLDList.jsx           ← List view
    ├── LLDHLDEditor.jsx         ← Form editor
    ├── LLDHLDViewer.jsx         ← Markdown viewer
    ├── LLDHLDSearch.jsx         ← Search & filters
    └── LLDHLDStats.jsx          ← Statistics
```

---

## 🔌 API Quick Reference

### Create Design
```
POST /api/v1/lld-hld
Body: { userId, title, designType, content, ... }
```

### List Designs  
```
GET /api/v1/lld-hld?category=System%20Design&limit=20
```

### View Design
```
GET /api/v1/lld-hld/{designId}
```

### Update Design
```
PUT /api/v1/lld-hld/{designId}
Body: { title, content, tags, ... }
```

### Toggle Completion
```
PATCH /api/v1/lld-hld/{designId}/completion
```

### Delete Design
```
DELETE /api/v1/lld-hld/{designId}
```

### Get Statistics
```
GET /api/v1/lld-hld/stats
```

### Get Tags
```
GET /api/v1/lld-hld/tags
```

---

## 🎨 Component Props

### LLDHLDVault
```jsx
<LLDHLDVault 
  userID="user123"  // Required: User ID
/>
```

### LLDHLDList
```jsx
<LLDHLDList 
  designs={[]}                    // Array of designs
  isLoading={false}              // Loading state
  onDelete={(id) => {}}          // Delete callback
  onToggleCompletion={(id) => {}} // Complete callback
  filters={{}}                   // Current filters
/>
```

### LLDHLDEditor
```jsx
<LLDHLDEditor 
  design={null}                  // Design to edit (null for create)
  onSave={(data) => {}}         // Save callback
  onCancel={() => {}}           // Cancel callback
  isSaving={false}              // Saving state
/>
```

### LLDHLDViewer
```jsx
<LLDHLDViewer 
  design={{}}                    // Design object
  onClose={() => {}}            // Close callback
  onToggleCompletion={(id) => {}} // Toggle callback
  onDelete={(id) => {}}         // Delete callback
/>
```

---

## 🐛 Common Debug Patterns

### Check API Response
```javascript
// In browser console
await fetch('http://localhost:4000/api/v1/lld-hld')
  .then(r => r.json())
  .then(d => console.table(d.data))
```

### Inspect Component State (React DevTools)
```
1. Open React DevTools tab
2. Find LLDHLDVault component
3. Check state object
4. Verify designs array
5. Check filters object
```

### Enable Verbose Logging
```javascript
// In service layer
console.log('Query:', query);
console.log('Results:', results);
console.error('Error:', error);
```

### Test API with cURL
```bash
# Create
curl -X POST http://localhost:4000/api/v1/lld-hld \
  -H "Content-Type: application/json" \
  -d '{"userId":"123","title":"Test","content":"# Test"}'

# List
curl http://localhost:4000/api/v1/lld-hld

# Get one
curl http://localhost:4000/api/v1/lld-hld/{id}
```

---

## 🔍 Search & Filter Cheat Sheet

```javascript
// Search parameter format
{
  search: "keyword",              // Full-text search
  isCompleted: true/false,        // Completion filter
  category: "System Design",      // Category filter
  designType: "HLD",              // Type filter (LLD/HLD/Both)
  difficulty: "Hard",             // Difficulty filter
  tag: "tag-name",                // Tag filter
  limit: 20,                      // Pagination
  skip: 0                         // Pagination offset
}
```

---

## 📋 Status Codes Reference

```
200 - OK (GET, PUT, PATCH)
201 - Created (POST)
204 - No Content (DELETE)
400 - Bad Request (validation error)
404 - Not Found (resource not found)
500 - Server Error (database/unexpected error)
```

---

## 🎯 Feature Flags & Toggles

### Enable/Disable Feature
In `App.jsx`, check if user is authenticated:
```javascript
{activeTab === 'lld-hld' && dashboard?.profile?._id ? (
  <LLDHLDVault userID={dashboard.profile._id} />
) : null}
```

---

## 🔐 Input Validation Rules

### Required Fields
- `title`: Non-empty string
- `content`: Non-empty markdown string
- `userId`: Valid ObjectId

### Optional Fields with Defaults
- `designType`: "Both" (LLD/HLD/Both)
- `category`: "Other" (System Design/Database/API/Architecture/Other)
- `difficulty`: "Medium" (Easy/Medium/Hard)
- `tags`: [] (array of strings)
- `resources`: [] (array of {title, url})

### Format Rules
- URL: Must start with http:// or https://
- Tag: Lowercase, trimmed
- Markdown: Any valid markdown syntax

---

## 📊 Database Indexes

```javascript
// Text indexes (for search)
db.lldhlddesigns.createIndex({ 
  title: "text", 
  content: "text", 
  description: "text" 
})

// Regular indexes (for filtering)
db.lldhlddesigns.createIndex({ userId: 1 })
db.lldhlddesigns.createIndex({ isCompleted: 1 })
db.lldhlddesigns.createIndex({ category: 1, designType: 1 })

// Compound indexes (for complex queries)
db.lldhlddesigns.createIndex({ userId: 1, isCompleted: 1 })
```

---

## 🎨 CSS Classes Quick Map

```
.lld-hld-vault              Main section
.lld-hld-stats              Statistics container
.lld-hld-search             Search & filter section
.lld-hld-list               List container
.list-item                  Individual design row
.lld-hld-editor-modal       Editor modal overlay
.lld-hld-viewer-modal       Viewer modal overlay
.badge                      Status badges
.difficulty-badge           Difficulty badges
.markdown-content           Rendered markdown area
```

---

## 🚀 Performance Tips

1. **Search**: Type to search, debounce prevents excessive requests
2. **Filters**: Combine multiple for faster results
3. **Pagination**: Use limit/skip for large lists
4. **Caching**: Frontend caches stats for 30 seconds (enhancement idea)
5. **Markdown**: Only loads when viewing full design

---

## ❌ Error Handling

```javascript
// Frontend error handling
try {
  const result = await someApiCall();
  // Handle success
} catch (error) {
  setError(error.message);
  console.error('API Error:', error);
}

// Backend error handling
try {
  const result = await dbOperation();
  return res.json({ success: true, data: result });
} catch (error) {
  return next(error); // Passes to error handler middleware
}
```

---

## 🔄 Data Flow Diagram

```
User Action
    ↓
React Component Updates State
    ↓
Component calls API function
    ↓
lldHldApi.js sends axios request
    ↓
Backend Route receives request
    ↓
Controller validates & delegates
    ↓
Service executes business logic
    ↓
MongoDB performs operation
    ↓
Service returns result
    ↓
Controller sends JSON response
    ↓
Axios response interceptor processes
    ↓
Component state updates
    ↓
UI re-renders
```

---

## 💡 Pro Tips

1. **Use Postman**: Import API endpoints for testing
2. **Check Logs**: Both browser console and server logs are helpful
3. **Use DevTools**: React DevTools for component inspection
4. **Test Edge Cases**: Empty searches, long strings, special chars
5. **Monitor Performance**: Check Network tab for response times

---

## 📞 Quick Help

| Issue | Solution |
|-------|----------|
| Designs not loading | Check userId passed correctly |
| Search not working | Verify MongoDB text indexes created |
| Markdown not rendering | Install react-markdown |
| Filters not applying | Check query parameters in Network tab |
| Design not saving | Check required fields in form |
| Delete not working | Check confirmation dialog appeared |
| Tags not saving | Verify comma-separated input |
| Modal not closing | Check event handlers |

---

## 🎓 Learning Resources

- React fundamentals: [React Docs](https://react.dev)
- Markdown syntax: [Markdown Guide](https://www.markdownguide.org)
- MongoDB queries: [MongoDB Docs](https://docs.mongodb.com)
- Express.js routing: [Express Docs](https://expressjs.com)
- Axios documentation: [Axios GitHub](https://github.com/axios/axios)

---

## 📝 Notes

- All components are functional components with hooks
- All styling is in App.css
- API response format: `{ success: bool, data: any }`
- Error format: `{ success: false, message: string }`
- Axios client handles auth & error interception automatically

---

**Last Updated**: March 21, 2026  
**Status**: Ready for Development/Testing
