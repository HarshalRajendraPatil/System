# Feature 3 LLD/HLD Design Vault - Setup & Testing Guide

## 🚀 Quick Start

### Prerequisites
- Node.js and npm installed
- MongoDB running
- Both Client and Server directories set up

### Installation Steps

#### 1. Backend Setup
```bash
cd Server
npm install
# Dependencies already include mongoose, express, etc.
```

#### 2. Frontend Setup
```bash
cd Client
npm install react-markdown  # Already done in setup
npm install
```

#### 3. Environment Configuration
Ensure `.env` files are properly configured:

**Server/.env**
```
MONGODB_URI=mongodb://localhost:27017/grindforge
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
```

**Client/.env**
```
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

### Running the Application

#### Terminal 1: Start Backend
```bash
cd Server
npm run dev
# Server runs on http://localhost:4000
```

#### Terminal 2: Start Frontend
```bash
cd Client
npm run dev
# Client runs on http://localhost:5173
```

## ✅ Testing Guide

### Test Scenario 1: Create a Design
1. Navigate to **LLD/HLD Vault** tab
2. Click **"+ Add Design"** button
3. Fill in the form:
   - Title: "Cache System Design"
   - Design Type: "HLD"
   - Category: "System Design"
   - Difficulty: "Medium"
   - Content: Add some markdown content
   - Tags: Add "caching", "performance"
   - Resources: Add a sample resource
4. Click **"Save Design"**
5. Verify design appears in list
6. Check stats updated

### Test Scenario 2: Search & Filter
1. In the design list, enter search text: "cache"
2. Apply filters:
   - Status: "Pending"
   - Type: "HLD"
   - Category: "System Design"
3. Verify results filtered correctly
4. Click **"Clear Filters"**
5. Verify all designs reappear

### Test Scenario 3: View & Edit
1. Click on a design in the list
2. Verify markdown renders correctly
3. See metadata, stats, tags, resources
4. Click **"Mark as Complete"**
5. Verify completion badge appears
6. Close and verify list shows completed status

### Test Scenario 4: Multiple Designs with Stats
1. Create at least 3-4 designs with:
   - Different types (LLD, HLD, Both)
   - Different categories
   - Different difficulties
   - Some marked complete
2. Check **Statistics Dashboard**:
   - Total Designs count
   - Completed count
   - Completion rate percentage
   - Breakdowns by category/type/difficulty

### Test Scenario 5: Delete Operation
1. Click on any design to view
2. Click **"Delete"** button
3. Confirm deletion in popup
4. Verify design removed from list
5. Check stats updated

### Test Scenario 6: Tag Management
1. Create design with multiple tags
2. Edit tags in editor:
   - Remove existing tags
   - Add new tags
3. Save changes
4. Verify tags updated in list view

### Test Scenario 7: Resource Management
1. Create design with resources
2. Click resource links to verify URLs work
3. Edit design to add/remove resources
4. Save and verify changes persist

### Test Scenario 8: Responsive Design Testing
1. Open DevTools (F12)
2. Toggle device toolbar
3. Test on mobile sizes:
   - 320px (small phone)
   - 768px (tablet)
   - 1024px (desktop)
4. Verify:
   - Layout adapts properly
   - All buttons clickable
   - Forms remain usable
   - Modals display correctly

## 📊 Database Operations

### Verify MongoDB Collections
```bash
# Connect to MongoDB
mongo

# List databases
show dbs

# Use grindforge database
use grindforge

# List collections
show collections

# Check LLDHLDDesign collection
db.lldhlddesigns.find()

# Check indexes
db.lldhlddesigns.getIndexes()
```

### Sample MongoDB Query
```javascript
// Find all HLD designs by user
db.lldhlddesigns.find({
  userId: ObjectId("user_id_here"),
  designType: "HLD"
});

// Count completed designs
db.lldhlddesigns.countDocuments({
  userId: ObjectId("user_id_here"),
  isCompleted: true
});

// Search for designs
db.lldhlddesigns.find({
  $text: { $search: "cache" }
});
```

## 🐛 Debugging Tips

### Frontend Debugging

**Check API Calls**
- Open DevTools Network tab
- Filter by XHR/Fetch
- Click design operations
- Verify request/response data
- Check status codes (200, 201, 204, 400, 404, 500)

**React DevTools**
- Install React DevTools Chrome extension
- Inspect component state
- Check props passed to components
- Use profiler for performance

**Console Logs**
```javascript
// In components or functions:
console.log('Design data:', design);
console.error('API Error:', error);
console.table(designs); // Display arrays as table
```

### Backend Debugging

**Enable Detailed Logging**
```javascript
// In service layer:
console.log('Query:', query);
console.log('Result:', result);
```

**Test Endpoints with cURL**
```bash
# Create design
curl -X POST http://localhost:4000/api/v1/lld-hld \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "title": "Test Design",
    "designType": "HLD",
    "content": "# Test"
  }'

# List designs
curl http://localhost:4000/api/v1/lld-hld?limit=10

# Get stats
curl http://localhost:4000/api/v1/lld-hld/stats

# View single design
curl http://localhost:4000/api/v1/lld-hld/designId123
```

## 🔍 Common Issues & Solutions

### Issue: "Designs not loading"
**Cause**: No user ID being passed
**Solution**: Ensure `dashboard.profile._id` exists before rendering LLDHLDVault
```javascript
{dashboard?.profile?._id ? <LLDHLDVault userID={...} /> : null}
```

### Issue: "Search not working"
**Cause**: Text indexes not created
**Solution**: Recreate indexes:
```bash
# In MongoDB
db.lldhlddesigns.dropIndexes()
db.lldhlddesigns.createIndex({ title: "text", content: "text", description: "text" })
```

### Issue: "Markdown not rendering"
**Cause**: react-markdown not installed
**Solution**: 
```bash
npm install react-markdown
```

### Issue: "Tags not saving"
**Cause**: Tag string not converted to array
**Solution**: Check lldHldEditor.jsx - tags are split by comma:
```javascript
const tagsArray = formData.tags.split(',').map(t => t.trim());
```

### Issue: "CORS errors"
**Cause**: API CORS not configured
**Solution**: Verify SERVER cors config includes CLIENT_ORIGIN

### Issue: "404 on /stats endpoint"
**Cause**: Route order - /stats interpreted as ID
**Solution**: Verified - routes fixed to have /stats before /:id

## 📈 Performance Tips

### Optimize Large Lists
- Implement pagination (already done with limit/skip)
- Filter first, render less data
- Use virtual scrolling for 100+ items

### Database Optimization
- Ensure indexes exist
- Monitor query performance
- Archive old designs periodically

### Frontend Optimization
- Use React.memo for list items
- Implement lazy loading for markdown
- Debounce search input

## 🎓 Code Examples

### Creating a Design Programmatically
```javascript
import { createLLDHLDDesign } from './api/lldHldApi';

const newDesign = {
  userId: 'user123',
  title: 'My Design',
  designType: 'HLD',
  category: 'System Design',
  difficulty: 'Medium',
  content: '# Heading\n## Sub-heading',
  tags: ['tag1', 'tag2'],
  resources: [
    { title: 'Reference', url: 'https://example.com' }
  ]
};

try {
  const result = await createLLDHLDDesign(newDesign);
  console.log('Created:', result);
} catch (error) {
  console.error('Failed:', error);
}
```

### Implementing Custom Search
```javascript
const customSearch = async (query, filters) => {
  const result = await getLLDHLDDesigns({
    search: query,
    category: filters.category,
    difficulty: filters.difficulty,
    // ... other filters
  });
  return result.designs;
};
```

## 📋 Deployment Checklist

- [ ] MongoDB indexes created
- [ ] Environment variables configured
- [ ] react-markdown installed
- [ ] axios configured in client
- [ ] API routes added to index.js
- [ ] Components integrated into App.jsx
- [ ] CSS styles added to App.css
- [ ] Error handling tested
- [ ] Mobile responsiveness verified
- [ ] All CRUD operations working

## 🚄 Performance Benchmarks

Target metrics:
- List load time: < 500ms
- Search response: < 300ms
- Create design: < 1s
- View design (with markdown render): < 800ms

## 📞 Support

For issues or questions:
1. Check console for errors
2. Verify API endpoints in Network tab
3. Review MongoDB collections
4. Re-read relevant section in documentation
5. Create detailed bug report with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages/logs
   - Browser/environment info

---

**Ready to test? Start with Test Scenario 1 above!**
