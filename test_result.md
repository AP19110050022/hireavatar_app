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

## user_problem_statement: "Connect the Brandface GitHub backend so mobile and hireavatar.co share presenters/offers; test Clerk Google/email sign-in after domain verification; fix send-offer loading, sign-in recovery, time zones, and remaining review findings."
## backend:
##   - task: "Offer, presenter, upload, and UTC reliability fixes"
##     implemented: true
##     working: true
##     file: "/app/backend/server.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: true
##         agent: "main"
##         comment: "Added timezone-aware Mongo reads, deterministic list ordering, atomic offer response/conversation creation, profile denormalization, hidden empty presenter cards, and verified image uploads. Local API regression suite passed 18/18."
##       - working: true
##         agent: "testing"
##         comment: "Public URL pytest passed 18/18. Added assertions for repeated paging, UTC offer/conversation/message output, hidden empty profiles, persisted name/photo propagation, oversized upload and business upload rejection. Internal sessions bypass Clerk; concurrency stress was not tested."
## frontend:
##   - task: "Sign-in recovery and Clerk connectivity fallback"
##     implemented: true
##     working: true
##     file: "/app/frontend/src/auth.tsx, /app/frontend/app/_layout.tsx"
##     stuck_count: 1
##     priority: "high"
##     needs_retesting: true
##     status_history:
##       - working: true
##         agent: "main"
##         comment: "A Clerk domain preflight prevents the SDK from mounting while DNS is unresolved, so the marketplace and a clear sign-in unavailable state remain interactive. Screenshot verified. Real Clerk sign-in remains externally blocked by clerk.hireavatar.co NXDOMAIN."
##       - working: true
##         agent: "testing"
##         comment: "375x667 public preview loads seeded presenter cards without permanent splash or error overlay. All six Welcome entry points open a clear unavailable card; back and cold/deep-link back work. Back target measures 44x44. Clerk DNS still fails; real Google/email and signed-in account-sync recovery remain unverified."
##   - task: "Send-offer loading failure state"
##     implemented: true
##     working: "NA"
##     file: "/app/frontend/app/offer/[presenterId].tsx"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: true
##     status_history:
##       - working: "NA"
##         agent: "main"
##         comment: "Added header, retry, error copy, and no endless spinner when presenter loading fails. Requires authenticated route validation."
##       - working: "NA"
##         agent: "testing"
##         comment: "Direct /offer/TEST_missing_presenter redirects to Welcome through the signed-out gate. Retry error state exists in code but cannot be dynamically verified without Clerk. src/api.ts fetch lacks a timeout, leaving stalled requests a potential endless-loading risk."
##       - working: "NA"
##         agent: "main"
##         comment: "Added a 15-second API request timeout, so a stalled presenter request now reaches the retry state instead of loading indefinitely. Final authenticated route verification remains blocked by Clerk DNS."
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 2
##   run_ui: true
## test_plan:
##   current_focus:
##     - "Run backend API regression including deterministic paging and UTC timestamps"
##     - "Verify unauthenticated Expo fallback does not hang or show an error overlay when Clerk DNS is unavailable"
##     - "Verify send-offer error state through a failing presenter request if route access can be arranged"
##   stuck_tasks:
##     - "Real Clerk sign-in is blocked until clerk.hireavatar.co DNS resolves"
##   test_all: true
##   test_priority: "high_first"
## agent_communication:
##   - agent: "main"
##     message: "No Git remote or Brandface backend source exists in this workspace, so live backend sharing cannot be connected yet. Do not attempt real Clerk sign-in while DNS remains NXDOMAIN. Test internal-token API flows and guest preview fallback."
##   - agent: "testing"
##     message: "Iteration 2 report: /app/test_reports/iteration_2.json. 18/18 public API tests passed; guest fallback and navigation passed. No functional application code changed. Remaining blockers: real Clerk DNS, production Brandface source, authenticated send-offer access. Code-review risks: unbounded API fetch, signature-only image validation, missing strip-card testIDs; console also warns about deprecated unstable-native-tabs."
##   - agent: "testing"
##     message: "The saved standalone UI runner requires Playwright/Chromium; local invocation failed with ModuleNotFoundError because Playwright is absent. The equivalent checks DID execute successfully through the browser automation tool. This is a test-runner dependency limitation, not an app failure."
##   - agent: "main"
##     message: "Post-test hardening added decoded image validation, bounded API requests, and presenter-card test IDs. Final checks passed: 18/18 backend tests, TypeScript, lint, backend health, and phone-size guest preview."