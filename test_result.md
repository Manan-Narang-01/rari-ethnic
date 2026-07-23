#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: >
  Design and begin implementing a production-ready backend architecture for the Rari Ethnic
  e-commerce site (customer accounts, RBAC for admin/super_admin, wishlist, reviews, coupons,
  Razorpay, etc.), building on the existing MongoDB/FastAPI backend rather than rewriting it on
  a different stack. Phase 1 (this pass): restructure backend into a modular app/ package and add
  real customer accounts + unified RBAC on top of the existing single-hardcoded-admin auth.

backend:
  - task: "Modular app/ package restructure (config, database, core, models, schemas, repositories, services, api/v1, utils)"
    implemented: true
    working: "NA"
    file: "backend/app/**, backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: >
          Moved all logic out of the single 475-line server.py + admin_lib.py into a layered
          app/ package (repositories talk to Mongo, services hold business logic, api/v1 holds
          routers). server.py is now a 4-line entrypoint (`from app.main import app`) so uvicorn
          server:app / supervisor config keeps working unchanged. All existing public/admin API
          paths are unchanged (verified via route introspection: 29 routes registered, same
          URLs as before). admin_lib.py deleted; its password/JWT helpers moved to
          app/core/security.py and its object-storage client to app/utils/storage.py.

  - task: "Customer registration/login + unified RBAC (customer/admin/super_admin) with JWT access+refresh tokens"
    implemented: true
    working: "NA"
    file: "backend/app/api/v1/auth.py, backend/app/services/auth_service.py, backend/app/api/deps.py, backend/app/repositories/user_repo.py, backend/app/repositories/session_repo.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: >
          Added POST /api/auth/register (self-serve customer signup), POST /api/auth/login
          (now works for any role -- customer/admin/super_admin -- instead of the old
          admin-only hardcoded check), POST /api/auth/refresh (rotating, single-use refresh
          tokens backed by a revocable refresh_sessions collection), POST /api/auth/logout,
          GET /api/auth/me, POST /api/auth/change-password, POST /api/auth/forgot-password +
          POST /api/auth/reset-password (token is logged server-side for now since no email
          provider is wired up yet -- see roadmap). require_admin now accepts both admin and
          super_admin roles and re-reads the user from the DB on every request (so
          deactivating a user or changing their role takes effect immediately, unlike the old
          scheme which trusted whatever role was baked into the JWT). Existing ADMIN_EMAIL/
          ADMIN_PASSWORD seeding still works via the same `users` collection; added optional
          SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD seeding. Startup now backfills legacy admin
          docs with the new required fields (name, is_active, email_verified, updated_at).
          Verified via: py_compile on all new modules; a clean venv install of pinned deps
          followed by `import app.main` (all 29 routes registered correctly, no import
          errors); and an offline unit check of hash/verify_password + create/decode
          access+refresh tokens + Pydantic schema serialization (confirmed password_hash is
          never present in API-facing UserOut/TokenResponse output). Could NOT run live
          end-to-end HTTP tests in this session -- no MongoDB instance is reachable in this
          Windows dev checkout (this project's real dev/test loop runs on the Emergent cloud
          sandbox where mongod + supervisor are already running). New tests are in
          backend/tests/backend_auth_test.py, written in the same live-HTTP/pytest style as
          the existing backend_test.py, ready to run once deployed to an environment with Mongo.

  - task: "Orders now optionally linked to the authenticated customer (user_id)"
    implemented: true
    working: "NA"
    file: "backend/app/models/order.py, backend/app/api/v1/orders.py, backend/app/repositories/order_repo.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: >
          POST /api/orders now accepts an optional Authorization header (guest checkout still
          works unchanged) and stamps user_id on the order when present, plus
          OrderRepository.list_for_user() for the future order-history endpoint. This is prep
          for the Order History phase of the roadmap, not a new customer-facing endpoint yet.

frontend:
  - task: "Admin auth context updated for new token/role response shape"
    implemented: true
    working: "NA"
    file: "frontend/src/context/AuthContext.jsx, frontend/src/pages/admin/AdminLogin.jsx, frontend/src/pages/admin/AdminLayout.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: >
          /api/auth/login now returns {access_token, refresh_token, token_type, user:{...}}
          instead of the old {access_token, token_type, email, role}; AuthContext.jsx updated
          to store both tokens and read user from the new shape, and to call
          POST /api/auth/logout on sign-out. Because /api/auth/login is now unified across all
          roles (not admin-only), AdminLayout.jsx now explicitly gates on
          role in [admin, super_admin] instead of just "is logged in", and AdminLogin.jsx
          rejects + logs out non-staff logins with a toast instead of redirect-looping. No new
          customer-facing screens (register/login/wishlist/etc.) were built -- see
          docs/BACKEND_ARCHITECTURE.md section 9 for the planned frontend work.

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Customer registration/login + unified RBAC (customer/admin/super_admin) with JWT access+refresh tokens"
    - "Modular app/ package restructure (config, database, core, models, schemas, repositories, services, api/v1, utils)"
    - "Admin auth context updated for new token/role response shape"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: >
      Phase 1 of the backend roadmap (see docs/BACKEND_ARCHITECTURE.md) is implemented:
      modular app/ structure + real customer accounts + unified RBAC on the existing MongoDB
      backend (kept Mongo rather than migrating to Postgres, per user decision). Verified
      statically (compiles, imports cleanly, all routes register, security/token/schema unit
      checks pass) but NOT against a live MongoDB -- there is no mongod reachable in this
      Windows checkout. Please run backend_test.py (regression) and backend_auth_test.py (new)
      against a deployed instance with Mongo before treating this as verified working=true.
      Existing product/order/subscribe/contact endpoints were moved but not behaviorally
      changed; backend_test.py should still pass unmodified.