import { test, expect } from '@playwright/test';

test.describe('Critical User Journeys', () => {
  test('User registration and login', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to registration
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/register');
    
    // Fill registration form
    await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    // Should redirect to verification page
    await expect(page).toHaveURL(/\/verify/);
    await expect(page.locator('text=Verification email sent')).toBeVisible();
  });

  test('Book search and purchase', async ({ page }) => {
    await page.goto('/');
    
    // Search for a book
    await page.fill('input[placeholder*="Search"]', 'science fiction');
    await page.click('button[type="submit"]');
    
    // Should see search results
    await expect(page.locator('.book-card')).toHaveCount.atLeast(1);
    
    // View book details
    await page.click('.book-card:first-child');
    await expect(page).toHaveURL(/\/books\/.+/);
    
    // Add to cart
    await page.click('text=Add to Cart');
    await expect(page.locator('text=Added to cart')).toBeVisible();
    
    // Go to checkout
    await page.click('a[href="/cart"]');
    await expect(page).toHaveURL('/cart');
    await page.click('text=Checkout');
    
    // Should be on checkout page
    await expect(page).toHaveURL(/\/checkout/);
  });

  test('Live session participation', async ({ page }) => {
    await page.goto('/live-sessions');
    
    // View upcoming sessions
    await expect(page.locator('.session-card')).toHaveCount.atLeast(1);
    
    // Join a session
    await page.click('.session-card:first-child');
    await expect(page).toHaveURL(/\/live\/.+/);
    
    // Should see session details
    await expect(page.locator('text=Live Session')).toBeVisible();
  });
});

test.describe('Accessibility Tests', () => {
  test('Homepage should be accessible', async ({ page }) => {
    await page.goto('/');
    
    // Check for accessibility issues
    const accessibilityScanResults = await page.accessibility.snapshot();
    
    // Ensure all images have alt text
    const imagesWithoutAlt = accessibilityScanResults.children
      .filter(child => child.role === 'img' && !child.name)
      .map(img => img.selector);
    
    expect(imagesWithoutAlt).toHaveLength(0);
    
    // Check keyboard navigation
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => 
      document.activeElement?.getAttribute('aria-label') || 
      document.activeElement?.textContent
    );
    
    expect(firstFocused).toBeTruthy();
  });
});