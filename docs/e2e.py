"""Browser end-to-end check. Requires: API on :5000 (dev mode), Vite on :5173, seeded DB.
Run: python3 docs/e2e.py   (needs `pip install playwright` + chromium)"""
import random, re, sys, time
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:5173"
OUT = "docs/screenshots"
PW = "Demo@12345"
results = []

def check(name, cond):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name)

def shot(page, name, full=True):
    page.screenshot(path=f"{OUT}/{name}.png", full_page=full)

def login(page, email, password=PW):
    page.goto(f"{BASE}/login")
    page.get_by_label("Email address").fill(email)
    page.get_by_label(re.compile(r"^Password")).fill(password)
    page.get_by_role("button", name="Log in").click()

def logout(page):
    page.get_by_role("button", name=re.compile("Log out")).click()
    page.wait_for_url("**/login")

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1366, "height": 850})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # ---------- unauthenticated ----------
    page.goto(f"{BASE}/vendors")
    page.wait_for_url("**/login")
    check("protected route redirects to login", "/login" in page.url)
    shot(page, "01-login")

    # failed login shows a generic error
    page.get_by_label("Email address").fill("officer@vendorbridge.demo")
    page.get_by_label(re.compile(r"^Password")).fill("WrongPass1")
    page.get_by_role("button", name="Log in").click()
    expect(page.get_by_role("alert").first).to_contain_text("Invalid email or password")
    check("invalid credentials show generic error", True)

    # ---------- registration ----------
    page.goto(f"{BASE}/register")
    page.get_by_role("button", name="Register").click()
    check("registration client validation shows errors", page.get_by_text("First name is required").is_visible())
    shot(page, "02-register-validation")
    email = f"e2e-{int(time.time())}@example.com"
    page.get_by_label("First name").fill("Eva")
    page.get_by_label("Last name").fill("Turner")
    page.get_by_label("Email address").fill(email)
    page.get_by_label("Phone number").fill("+91 98765 43210")
    page.get_by_label("Country").fill("India")
    page.get_by_label("Additional information").fill("Registered by the e2e test")
    page.get_by_label(re.compile(r"^Password")).fill("Secret123")
    page.get_by_label("Confirm password").fill("Secret123")
    check("role dropdown offers no privileged roles",
          page.get_by_label("Role").locator("option").all_inner_texts() == ["Vendor", "Procurement Officer"])
    shot(page, "03-register-filled")
    page.get_by_role("button", name="Register").click()
    page.wait_for_url("**/login")
    check("registration succeeds and redirects to login with notice", page.get_by_text("Registration successful").is_visible())
    login(page, email, "Secret123")
    page.wait_for_url(f"{BASE}/")
    check("newly registered Vendor can sign in", page.get_by_text("Welcome back, Eva").is_visible())
    check("vendor role dashboard shows no company metrics", page.get_by_text("Active vendors").count() == 0)
    check("vendor role has no Users admin link", page.get_by_role("link", name="Users").count() == 0)
    shot(page, "04-dashboard-vendor-role")
    # backend blocks a vendor from admin API even by direct URL
    page.goto(f"{BASE}/users")
    try:
        page.get_by_text("You do not have access").wait_for(timeout=8000); denied = True
    except Exception:
        denied = False
    check("vendor cannot open admin Users page", denied)
    logout(page)

    # ---------- officer: dashboard + vendors CRUD ----------
    login(page, "officer@vendorbridge.demo")
    page.wait_for_url(f"{BASE}/")
    page.get_by_text("Recent activity").wait_for()
    check("dashboard greets the authenticated user", page.get_by_text("Welcome back, Priya").is_visible())
    check("dashboard has four summary cards", page.locator(".vb-stat").count() == 4)
    check("spend / PO cards are honest placeholders (no fake numbers)", page.locator(".vb-stat-muted").count() == 2)
    shot(page, "05-dashboard")
    for label in ["Dashboard", "Vendors", "RFQ's", "Quotations", "Approvals", "Purchase orders", "Invoices", "Reports", "Activity"]:
        check(f"sidebar has {label}", page.get_by_role("navigation", name="Main navigation").get_by_role("link", name=re.compile(label)).count() == 1)
    page.get_by_role("navigation", name="Main navigation").get_by_role("link", name=re.compile("RFQ")).click()
    check("future module shows an upcoming-feature page", page.get_by_text("is not available yet").is_visible())
    shot(page, "06-upcoming-module")
    page.get_by_role("navigation", name="Main navigation").get_by_role("link", name="Dashboard").click()
    page.get_by_text("Recent activity").wait_for()

    page.get_by_role("link", name="Add vendor").click()          # dashboard quick action
    page.wait_for_url(re.compile("/vendors"))
    check("quick action opens the Add vendor form", page.get_by_role("dialog").is_visible())
    page.get_by_role("button", name="Create vendor").click()
    check("vendor form shows validation errors", page.get_by_text("Vendor name must be at least 2 characters").is_visible())
    shot(page, "07-vendor-form-validation")
    name = f"E2E Supplies {int(time.time())}"
    page.get_by_role("dialog").get_by_label("Vendor name").fill(name)
    page.get_by_role("dialog").get_by_label("Category").select_option("Furniture")
    page.get_by_role("dialog").get_by_label("GSTIN").fill("BADGST")
    page.get_by_role("dialog").get_by_label("Contact person").fill("Dana Cole")
    page.get_by_role("dialog").get_by_label("Contact email").fill("dana@e2e.example")
    page.get_by_role("dialog").get_by_label("Contact phone").fill("+91 98250 00000")
    page.get_by_role("dialog").get_by_label("Address").fill("22 Test Lane, Mumbai")
    page.get_by_role("button", name="Create vendor").click()
    check("India GST format is validated", page.get_by_text("valid 15-character GSTIN").is_visible())
    page.get_by_role("dialog").get_by_label("GSTIN").fill(f"27AABCE{random.randint(1000,9999)}E1Z6")
    page.get_by_role("button", name="Create vendor").click()
    page.get_by_text("Vendor created.").wait_for()
    row = page.get_by_role("row", name=re.compile(name))
    row.wait_for()
    check("vendor created and shown with Pending status", row.get_by_text("Pending").is_visible())
    shot(page, "08-vendors-after-create")

    # search + filters (server-side)
    page.get_by_label("Search vendors").fill("tech core")
    page.wait_for_function("document.querySelectorAll('tbody tr').length === 1")
    check("search narrows results via the API", page.locator("tbody tr").count() == 1 and "Tech Core" in page.locator("tbody").inner_text())
    shot(page, "09-vendors-search")
    page.get_by_label("Search vendors").fill("")
    page.get_by_label("Filter by category").select_option("Logistics")
    page.get_by_role("button", name=re.compile("^Blocked")).click()
    page.locator("tbody").get_by_text("FastLog Transport").wait_for()
    page.wait_for_function("document.querySelectorAll('tbody tr').length === 1")
    check("category + status filters combine", "FastLog" in page.locator("tbody").inner_text())
    page.get_by_label("Search vendors").fill("zzzz-nothing")
    page.get_by_text("No vendors match your filters").wait_for()
    check("empty state shown when nothing matches", True)
    shot(page, "10-vendors-empty-filter")
    page.get_by_role("button", name="Clear filters").click()

    # view + edit + persistence across reload
    page.get_by_label("Search vendors").fill(name)
    page.get_by_role("row", name=re.compile(name)).get_by_role("button", name="View").click()
    check("vendor details dialog opens", page.get_by_role("dialog").get_by_text("dana@e2e.example").is_visible())
    shot(page, "11-vendor-details")
    page.get_by_role("button", name="Edit vendor").click()
    page.get_by_role("dialog").get_by_label("Contact person").fill("Dana Updated")
    page.get_by_role("button", name="Save changes").click()
    page.get_by_text("Vendor updated.").wait_for()
    page.reload()
    page.get_by_label("Search vendors").fill(name)
    page.get_by_role("row", name=re.compile(name)).wait_for()
    check("edit persists after a full page refresh", "Dana Updated" in page.locator("tbody").inner_text())
    check("officer's status dropdown cannot choose Active/Blocked",
          (page.get_by_role("row", name=re.compile(name)).get_by_role("button", name=re.compile("^Edit")).click() or True)
          and page.get_by_role("dialog").get_by_label("Status").locator("option").all_inner_texts() == ["Pending", "Inactive"])
    page.get_by_role("button", name="Cancel").click()

    # archive
    page.get_by_role("row", name=re.compile(name)).get_by_role("button", name=re.compile("^Archive")).click()
    shot(page, "12-archive-confirm")
    page.get_by_role("button", name="Archive vendor").click()
    page.get_by_text("Vendor archived.").wait_for()
    page.reload()
    page.get_by_label("Search vendors").fill(name)
    page.get_by_text("No vendors match your filters").wait_for()
    check("archived vendor is gone from the list after refresh", True)
    check("officer has no Users admin link", page.get_by_role("link", name="Users").count() == 0)
    logout(page)

    # ---------- manager: approve only ----------
    login(page, "manager@vendorbridge.demo")
    page.wait_for_url(f"{BASE}/")
    page.goto(f"{BASE}/vendors?status=Pending")
    page.locator("tbody tr").first.wait_for()
    check("manager sees no Add vendor / Archive controls",
          page.get_by_role("button", name="Add vendor").count() == 0 and page.get_by_role("button", name=re.compile("^Archive")).count() == 0)
    page.locator("tbody tr").first.get_by_role("button", name=re.compile("^Change status")).click()
    check("manager edit dialog is status-only", page.get_by_role("dialog").get_by_label("Vendor name").is_disabled())
    page.get_by_role("dialog").get_by_label("Status").select_option("Active")
    page.get_by_role("button", name="Save changes").click()
    page.get_by_text("Vendor updated.").wait_for()
    check("manager can approve a vendor", True)
    shot(page, "13-manager-vendors")
    logout(page)

    # ---------- admin: users ----------
    login(page, "admin@vendorbridge.demo")
    page.wait_for_url(f"{BASE}/")
    page.get_by_role("link", name="Users").click()
    page.get_by_role("heading", name="Users", exact=True).wait_for()
    check("admin can open the Users page", True)
    page.get_by_label("Search users").fill("admin@vendorbridge.demo")
    page.get_by_label("Role for Asha Admin").wait_for()
    shot(page, "14-admin-users")
    check("admin cannot edit their own role in the UI", page.get_by_label("Role for Asha Admin").is_disabled())
    logout(page)

    # ---------- forgot password page ----------
    page.get_by_role("link", name="Forgot password?").click()
    page.get_by_label("Email address").fill("nobody@example.com")
    page.get_by_role("button", name="Send reset link").click()
    page.get_by_text("If an account exists").wait_for()
    check("forgot-password gives a generic confirmation", True)
    shot(page, "15-forgot-password")

    # ---------- mobile ----------
    m = browser.new_context(viewport={"width": 390, "height": 800}, is_mobile=True)
    mp = m.new_page()
    login(mp, "officer@vendorbridge.demo")
    mp.get_by_text("Recent activity").wait_for()
    check("mobile: sidebar hidden by default", mp.locator("#vb-sidebar").bounding_box()["x"] < 0)
    shot(mp, "16-mobile-dashboard", full=False)
    mp.get_by_role("button", name="Toggle navigation").click()
    mp.wait_for_timeout(400)
    check("mobile: sidebar opens from the menu button", mp.locator("#vb-sidebar").bounding_box()["x"] >= 0)
    shot(mp, "17-mobile-sidebar", full=False)
    mp.get_by_role("link", name=re.compile("Vendors")).click()
    mp.locator("tbody tr").first.wait_for()
    check("mobile: table scrolls inside its container (no page overflow)",
          mp.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))
    shot(mp, "18-mobile-vendors", full=False)

    check("no uncaught browser JS errors", not errors)
    if errors: print(errors)
    browser.close()

failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
