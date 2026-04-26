# Admin Dashboard Guide

## Overview
The LearnHub elearning platform now includes a comprehensive admin dashboard for managing users, courses, tests, and platform content. This guide covers all the features and how to use them.

## Accessing the Admin Dashboard

1. Only users with the **admin** role can access the admin dashboard
2. Once logged in as an admin, you'll see the "Admin" section in the sidebar
3. Click on any admin page to access management tools

## Admin Features

### 1. **Admin Dashboard** (`/admin`)
The main overview page showing platform statistics and quick navigation.

#### Features:
- **Platform Statistics:**
  - Total Users
  - Total Courses
  - Total Tests
  - Total Enrollments
  - Active Instructors
  - Active Courses

- **Quick Management Cards:**
  - User Management
  - Course Management
  - Test Management
  - Content Moderation

- **Summary Section:**
  Quick view of all key metrics at a glance

### 2. **User Management** (`/admin/users`)
Comprehensive user management system for controlling all platform users.

#### Features:

**Search & Filter:**
- Search users by name or email
- Filter by role (Student, Instructor, Admin)
- Pagination with customizable limits

**User Actions:**
- **Edit Roles:** Click the edit icon to modify user roles
  - Assign multiple roles to a single user
  - Make users instructors, admins, or keep them as students

- **Activate/Deactivate:** Toggle user active status
  - Green button = User is active
  - Yellow button = User is inactive
  - Inactive users cannot log in

- **Delete Users:** Permanently remove users from the platform
  - Deleting a user also removes their courses and enrollments
  - This action cannot be undone

**Data Displayed:**
- User name and avatar
- Email address
- Current roles
- Account creation date
- Account status (Active/Inactive)

### 3. **Course Management** (`/admin/courses`)
Monitor and manage all courses on the platform.

#### Features:

**Search & Filter:**
- Search courses by title
- Filter by course status (Draft, Published, Archived)

**Course Statistics:**
- Total courses on the platform
- Published courses
- Draft courses

**Course Information:**
- Course title and thumbnail
- Instructor name
- Category
- Course level (Beginner/Intermediate/Advanced)
- Student enrollments
- Current status
- Creation date

**Course Actions:**
- **Edit Status:** Click the status badge or edit icon to change course status
  - **Draft:** Course is being created, not visible to students
  - **Published:** Course is live and visible to students
  - **Archived:** Course is no longer available

- **Delete Course:** Permanently remove a course
  - This removes all associated sessions and content
  - Students lose enrollment access

### 4. **Test Management** (`/admin/tests`)
Manage all tests and assessments on the platform.

#### Features:

**Search & Filter:**
- Search tests by title
- Filter by test status (Draft, Published, Archived)

**Test Information:**
- Test title and icon
- Creator name and email
- Associated course (if any)
- Number of questions
- Test status
- Creation date

**Test Actions:**
- **Update Status:** Click the status badge to modify test status
  - **Draft:** Test is being created
  - **Published:** Test is available for students
  - **Archived:** Test is no longer available

- **Delete Test:** Permanently remove a test
  - Test attempts by students are also removed
  - Cannot be undone

### 5. **Content Moderation** (`/admin/moderation`)
Review and moderate community posts and user-generated content.

#### Features:
- View all community posts
- Review post content and user information
- Remove inappropriate or violating content
- Manage user-generated posts to maintain platform quality

## Admin Dashboard Navigation

The updated sidebar includes an "Admin" section with quick links to all admin pages:
- **Dashboard** - Overview and statistics
- **Users** - User management
- **Courses** - Course management
- **Tests** - Test management
- **Moderation** - Content moderation

## Key Responsibilities

As an admin, you are responsible for:

1. **User Management:**
   - Managing user roles and permissions
   - Deactivating problematic users
   - Maintaining user account security

2. **Course Quality:**
   - Reviewing course content
   - Publishing and archiving courses
   - Ensuring courses meet platform standards

3. **Assessment Integrity:**
   - Managing test availability
   - Monitoring test quality
   - Ensuring tests are appropriate

4. **Content Moderation:**
   - Removing inappropriate posts
   - Maintaining community standards
   - Protecting platform reputation

## Best Practices

1. **Before Deleting Users or Content:**
   - Review the data thoroughly
   - Consider deactivating instead of deleting
   - Document your reasons for major actions

2. **Course Management:**
   - Regular review of new courses
   - Archive outdated content
   - Monitor course quality and engagement

3. **User Roles:**
   - Carefully assign instructor roles
   - Verify credentials before promotion
   - Audit role assignments regularly

4. **Content Moderation:**
   - Review flagged content promptly
   - Maintain consistent moderation standards
   - Keep records of moderation actions

## Troubleshooting

**Cannot access admin pages?**
- Verify you have the admin role
- Log out and log back in
- Check browser permissions

**Data not updating?**
- Refresh the page
- Check network connection
- Verify admin permissions

**Accidental deletion?**
- Unfortunately, deletions cannot be undone
- Contact system administrator for database recovery
- Always backup important data

## Backend API Endpoints

The following API endpoints power the admin dashboard:

```
# User Management
GET    /api/admin/users              - List all users
PUT    /api/admin/users/:userId      - Update user
DELETE /api/admin/users/:userId      - Delete user

# Course Management
GET    /api/admin/courses            - List all courses
PUT    /api/admin/courses/:courseId/approve - Approve/archive course
DELETE /api/admin/courses/:courseId  - Delete course

# Test Management
GET    /api/admin/tests              - List all tests
PUT    /api/admin/tests/:testId      - Update test
DELETE /api/admin/tests/:testId      - Delete test

# Content Moderation
GET    /api/admin/moderation         - Get flagged posts
DELETE /api/admin/moderation/posts/:postId - Remove post

# Statistics
GET    /api/admin/stats              - Get platform statistics
```

## Security Notes

- Only admins can access admin pages
- All admin actions are logged (implement logging)
- Sensitive operations require confirmation
- Regular backups are recommended
- Monitor admin activity for anomalies

## Future Enhancements

- Bulk user actions
- Advanced analytics and reporting
- Admin activity logging
- Automated content moderation
- User ban system
- Course approval workflow
- Test result analytics

---

For more information or support, contact the platform administrator.
