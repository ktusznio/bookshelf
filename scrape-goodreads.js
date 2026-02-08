/*
 * Goodreads Book Scraper
 * ======================
 *
 * HOW TO USE:
 *
 * 1. Open your Goodreads profile or any of your shelf pages in a browser:
 *    https://www.goodreads.com/review/list/2918018-kamil
 *
 * 2. Open the browser console:
 *    - Desktop: Cmd+Option+J (Mac) or Ctrl+Shift+J (Windows/Linux)
 *    - iPad:  Connect to a Mac, open Safari > Develop > [your iPad] > [the tab]
 *
 * 3. Paste this entire script into the console and press Enter.
 *
 * 4. Wait while it scrapes all pages (it logs progress).
 *
 * 5. A file called "goodreads-books.json" will download automatically.
 *
 * 6. In the Bookshelf app, click "Import Goodreads" and select the JSON file.
 *
 *
 * BOOKMARKLET (alternative — works on iPad without a console):
 *
 * 1. Create any bookmark in Safari.
 * 2. Edit the bookmark and replace the URL with the minified script at the
 *    bottom of this file (the line starting with "javascript:").
 * 3. Navigate to your Goodreads shelf page.
 * 4. Tap the bookmarklet — it will scrape and download the file.
 */

(async function () {
  'use strict';

  // Detect user ID from the current page URL
  const match = location.href.match(/(?:review\/list|user\/show)\/(\d+)/);
  if (!match) {
    alert('Please navigate to your Goodreads profile or shelf page first.');
    return;
  }
  const userId = match[1];

  const RATING_MAP = {
    'did not like it': 1,
    'it was ok': 2,
    'liked it': 3,
    'really liked it': 4,
    'it was amazing': 5,
  };

  const allBooks = [];
  let page = 1;
  let hasMore = true;

  console.log('Scraping Goodreads books for user ' + userId + '...');

  while (hasMore) {
    const url = '/review/list/' + userId +
      '?shelf=%23ALL%23&page=' + page + '&per_page=100&sort=date_added&order=d';

    let html;
    try {
      const resp = await fetch(url, { credentials: 'same-origin' });
      html = await resp.text();
    } catch (err) {
      console.error('Failed to fetch page ' + page + ':', err);
      break;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('tr.bookalike.review');

    if (rows.length === 0) {
      hasMore = false;
      break;
    }

    rows.forEach(function (row) {
      // Title
      var titleEl = row.querySelector('td.field.title a');
      var title = titleEl ? titleEl.getAttribute('title') || titleEl.textContent : '';
      title = title.trim();

      // Author (last, first → first last)
      var authorEl = row.querySelector('td.field.author .value a');
      var author = authorEl ? authorEl.textContent.trim() : '';
      // Goodreads often shows "Last, First" — flip it
      if (author.indexOf(',') !== -1) {
        var parts = author.split(',');
        author = parts[1].trim() + ' ' + parts[0].trim();
      }

      // User rating
      var rating = 0;
      var starsEl = row.querySelector('td.field.rating .staticStars');
      if (starsEl) {
        var starsTitle = (starsEl.getAttribute('title') || '').trim().toLowerCase();
        rating = RATING_MAP[starsTitle] || 0;
      }
      // Fallback: count filled star spans
      if (rating === 0) {
        var filledStars = row.querySelectorAll('td.field.rating .staticStar.p10');
        if (filledStars.length > 0) rating = filledStars.length;
      }

      // Shelf (exclusive shelf)
      var shelf = '';
      var shelvesCell = row.querySelector('td.field.shelves .value');
      if (shelvesCell) {
        var shelfLink = shelvesCell.querySelector('a');
        shelf = shelfLink ? shelfLink.textContent.trim() : shelvesCell.textContent.trim();
      }

      if (title) {
        allBooks.push({ title: title, author: author, rating: rating, shelf: shelf });
      }
    });

    console.log('Page ' + page + ': found ' + rows.length + ' books (total: ' + allBooks.length + ')');

    // Check for next page
    var nextLink = doc.querySelector('a.next_page');
    if (!nextLink || nextLink.classList.contains('disabled')) {
      hasMore = false;
    } else {
      page++;
      // Be polite — wait 500ms between requests
      await new Promise(function (r) { setTimeout(r, 500); });
    }
  }

  if (allBooks.length === 0) {
    alert('No books found. Make sure you are logged in and on the right page.');
    return;
  }

  // Download as JSON
  var blob = new Blob([JSON.stringify(allBooks, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'goodreads-books.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('Done! Scraped ' + allBooks.length + ' books.');
  alert('Scraped ' + allBooks.length + ' books! The file "goodreads-books.json" has been downloaded.\n\nOpen your Bookshelf app and click "Import Goodreads" to load it.');
})();


/*
 * BOOKMARKLET VERSION (paste this as a bookmark URL):
 *
 * javascript:void((async()=>{const m=location.href.match(/(?:review\/list|user\/show)\/(\d+)/);if(!m){alert("Go to your Goodreads shelf page first");return}const u=m[1],R={%22did not like it%22:1,%22it was ok%22:2,%22liked it%22:3,%22really liked it%22:4,%22it was amazing%22:5},B=[];let p=1,go=true;while(go){const r=await fetch("/review/list/"+u+"?shelf=%2523ALL%2523&page="+p+"&per_page=100",{credentials:"same-origin"});const h=await r.text();const d=new DOMParser().parseFromString(h,"text/html");const rows=d.querySelectorAll("tr.bookalike.review");if(!rows.length){go=false;break}rows.forEach(row=>{const te=row.querySelector("td.field.title a");let t=te?te.getAttribute("title")||te.textContent:"";t=t.trim();const ae=row.querySelector("td.field.author .value a");let a=ae?ae.textContent.trim():"";if(a.includes(",")){const p=a.split(",");a=p[1].trim()+" "+p[0].trim()}let rt=0;const se=row.querySelector("td.field.rating .staticStars");if(se){rt=R[(se.getAttribute("title")||"").trim().toLowerCase()]||0}const sc=row.querySelector("td.field.shelves .value");const sh=sc?sc.textContent.trim():"";if(t)B.push({title:t,author:a,rating:rt,shelf:sh})});const nx=d.querySelector("a.next_page");if(!nx||nx.classList.contains("disabled"))go=false;else{p++;await new Promise(r=>setTimeout(r,500))}}if(!B.length){alert("No books found");return}const bl=new Blob([JSON.stringify(B)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(bl);a.download="goodreads-books.json";document.body.appendChild(a);a.click();document.body.removeChild(a);alert("Scraped "+B.length+" books!")})())
 */
