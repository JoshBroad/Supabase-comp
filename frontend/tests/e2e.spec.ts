import { test, expect } from '@playwright/test';

test('End-to-end flow: Load sample data and build database', async ({ page }) => {
  // 1. Navigate to home page
  await page.goto('/');
  await expect(page).toHaveTitle(/Data Lake/);
  await expect(page.getByRole('heading', { name: 'Data Lake → SQL' })).toBeVisible();

  // 2. Load sample data
  const loadButton = page.getByRole('button', { name: 'Load Sample E-Commerce Data' });
  await loadButton.click();

  // 3. Wait for files to be selected
  await expect(page.getByText('10 files selected')).toBeVisible({ timeout: 10000 });
  
  // Verify some file names are present
  await expect(page.getByText('customers.csv')).toBeVisible();
  await expect(page.getByText('orders.json')).toBeVisible();

  // 4. Start Analysis
  const analyzeButton = page.getByRole('button', { name: 'Analyze 10 Files & Build Database' });
  await analyzeButton.click();

  // 5. Wait for navigation to build page
  await expect(page).toHaveURL(/\/build\/.+/, { timeout: 10000 });

  // 6. Verify build page elements
  // Initially it might show "Waiting for schema generation..."
  // We want to wait for the schema graph or some progress.
  // The "Database Ready" button appears when session.status === 'succeeded'
  
  // Since the build process might take a while, we increase the timeout.
  // We'll look for the "Database Ready" button or at least some timeline events.
  
  // Wait for at least one timeline event or the graph to load
  // "Waiting for schema generation..." should eventually disappear
  // But for a full E2E, let's wait for a specific success indicator if possible, 
  // or just verify the page structure if the build takes too long.
  
  // Let's check if the timeline is present
  await expect(page.locator('.w-80.md\\:w-96')).toBeVisible(); // Timeline container
  
  // Check for "Analyzing Files" or similar text in the timeline/status
  // The BuildTimeline component isn't fully visible in the read output, but we can guess.
  
  // Let's wait for the "Database Ready" button with a long timeout (e.g. 60s or more)
  // If the agent is fast, it should finish. If not, we might time out.
  // Let's set a reasonable timeout of 120s for the whole test or this step.
  
  console.log('Waiting for database build to complete...');
  
  // We can also check for "Designing Schema" or "Executing SQL" text which might appear in PresenceBar
  
  // Wait for the "Database Ready" button
  // Note: The button has text "Database Ready" and is an outline variant.
  // It is conditionally rendered: {session.status === 'succeeded' && ...}
  
  try {
    await expect(page.getByRole('button', { name: 'Database Ready' })).toBeVisible({ timeout: 60000 });
    console.log('Database build completed successfully!');
  } catch (e) {
    console.log('Database build did not complete within 60s, but page is active.');
    // If it times out, we at least verified we got to the build page and it's processing.
    // We can take a screenshot for debugging.
    await page.screenshot({ path: 'build-page-timeout.png' });
    // Fail the test if we really expect it to pass, or pass with a warning.
    // For "run this repo end to end", we probably want it to succeed.
    // Let's try to wait longer if needed, or just assert we are on the page.
    throw e;
  }
});
