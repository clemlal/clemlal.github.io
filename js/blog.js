// Local preview of the blog drafts on the home page.
//
// Published posts are listed in index.html (#blog, one <li> per post, newest
// first). index.html?drafts also lists, with a "Draft" label, the posts of
// drafts/drafts.js. That file is in drafts/, which git never commits, so it
// only exists on this computer: on the public site, ?drafts changes nothing.

(function () {
  const section = document.getElementById('blog');
  if (!section || !new URLSearchParams(window.location.search).has('drafts')) return;
  const list = section.querySelector('.post-list');

  // One item of the list, as the published ones are written in index.html.
  function item(post) {
    const li = document.createElement('li');
    li.className = 'post-item';
    li.innerHTML = '<a class="post-item-title"></a> <span class="post-item-draft">Draft</span><div class="post-item-meta"></div><p class="post-item-dek"></p>';
    li.querySelector('a').href = post.href;
    li.querySelector('a').textContent = post.title;
    li.querySelector('.post-item-meta').textContent = post.date;
    li.querySelector('.post-item-dek').textContent = post.dek;
    return li;
  }

  const script = document.createElement('script');
  script.src = 'drafts/drafts.js';
  script.onload = () => {
    for (const post of window.siteDrafts || []) list.prepend(item(post));
  };
  document.head.appendChild(script);
})();
