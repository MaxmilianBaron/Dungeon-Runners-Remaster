(() => {
  const data = window.DR_GALLERY;
  const approved = new Set(data.reviewedNames || []);
  const items = data.items.filter(item => item.reviewed === true && item.status === 'remade' && approved.has(item.name)).map(item => ({
    ...item,
    title: item.title || item.label || item.id,
    kind: item.kind || 'Texture'
  }));
  const byId = new Map(items.map(item => [item.id, item]));
  const el = id => document.getElementById(id);
  const number = value => new Intl.NumberFormat('en-US').format(value);
  const total = data.catalogTotal;
  const done = new Set(items.map(item => item.name)).size;
  const percent = total ? done / total * 100 : 0;
  el('catalog-count').textContent = number(done) + ' / ' + number(total);
  el('catalog-percent').textContent = percent.toFixed(2) + '%';
  const meter = el('catalog-meter');
  meter.firstElementChild.style.width = percent + '%';
  meter.setAttribute('aria-valuemin', '0');
  meter.setAttribute('aria-valuemax', String(total));
  meter.setAttribute('aria-valuenow', String(done));
  meter.setAttribute('aria-valuetext', number(done) + ' of ' + number(total) + ' remastered textures');
  if (el('progress-rows')) {
    let page = 0;
    const drawRows = () => {
      const query = el('texture-search').value.trim().toLowerCase();
      const matching = items.filter(item => item.name.toLowerCase().includes(query));
      const pages = Math.max(1, Math.ceil(matching.length / 100));
      page = Math.min(page, pages - 1);
      el('texture-page').textContent = (page + 1) + ' / ' + pages;
      el('previous-page').disabled = page === 0;
      el('next-page').disabled = page + 1 === pages;
      el('progress-rows').replaceChildren(...matching.slice(page * 100, (page + 1) * 100).map(item => {
        const row = document.createElement('tr');
        const name = document.createElement('td');
        const link = document.createElement('a');
        link.href = 'index.html#' + encodeURIComponent(item.id) + '/DDS';
        link.textContent = item.name;
        name.append(link);
        const status = document.createElement('td');
        status.textContent = 'Remastered';
        status.className = 'state-remade';
        row.append(name, status);
        return row;
      }));
    };
    el('texture-search').addEventListener('input', () => {page = 0; drawRows();});
    el('previous-page').addEventListener('click', () => {page--; drawRows();});
    el('next-page').addEventListener('click', () => {page++; drawRows();});
    drawRows();
    return;
  }
  if (!items.length) {
    el('title').textContent = 'Remastered';
    return;
  }
  const categories = [...new Set(items.map(item => item.category))];
  let current = items[0], activeView = current.views[0];
  const option = (value, label) => {
    const node = document.createElement('option');
    node.value = value;
    node.textContent = label;
    return node;
  };
  const viewLabel = view => {
    if (view.key === 'GreyHair') return 'White (Gray)';
    return view.key.endsWith('Hair') ? view.key.slice(0, -4).replace(/([a-z])([A-Z])/g, '$1 $2') : view.label;
  };
  const setOptions = (node, rows, value) => {
    node.replaceChildren(...rows.map(row => option(row[0], row[1])));
    node.value = value;
  };
  function drawCollection() {
    const rows = items.filter(item => item.category === current.category);
    el('collection-title').textContent = current.category;
    el('count').textContent = rows.length + ' assets';
    el('collection').replaceChildren(...rows.map(item => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.dataset.id = item.id;
      card.setAttribute('aria-pressed', String(item.id === current.id));
      const img = document.createElement('img');
      img.src = item.thumbnail;
      img.alt = item.title;
      img.loading = 'lazy';
      const label = document.createElement('span');
      label.textContent = item.title;
      card.append(img, label);
      card.addEventListener('click', () => choose(item.id));
      return card;
    }));
  }
  function drawView() {
    const captions = document.querySelectorAll('.pair figcaption');
    captions[0].textContent = activeView.originalLabel || 'Original';
    captions[1].textContent = activeView.remasteredLabel || 'Remastered';
    el('kind').textContent = current.kind;
    el('title').textContent = current.title;
    el('original').src = activeView.original;
    el('remastered').src = activeView.remastered;
    el('original').alt = current.title + ' · ' + captions[0].textContent;
    el('remastered').alt = current.title + ' · ' + captions[1].textContent;
    el('original-button').setAttribute('aria-label', 'Enlarge ' + captions[0].textContent);
    el('remastered-button').setAttribute('aria-label', 'Enlarge ' + captions[1].textContent);
    document.querySelector('.pair').classList.toggle('texture', !current.kind.startsWith('3D'));
    history.replaceState(null, '', '#' + encodeURIComponent(current.id) + '/' + encodeURIComponent(activeView.key));
  }
  function choose(id, viewKey) {
    if (!byId.has(id)) return;
    current = byId.get(id);
    activeView = current.views.find(view => view.key === viewKey) || current.views[0];
    el('category').value = current.category;
    setOptions(el('asset'), items.filter(item => item.category === current.category).map(item => [item.id, item.title]), current.id);
    setOptions(el('view'), current.views.map(view => [view.key, viewLabel(view)]), activeView.key);
    el('view').disabled = current.views.length === 1;
    drawCollection();
    drawView();
  }
  setOptions(el('category'), categories.map(name => [name, name]), current.category);
  el('category').addEventListener('change', () => choose(items.find(item => item.category === el('category').value).id));
  el('asset').addEventListener('change', () => choose(el('asset').value));
  el('view').addEventListener('change', () => {
    activeView = current.views.find(view => view.key === el('view').value);
    drawView();
  });
  for (const mode of ['original', 'remastered']) {
    el(mode).addEventListener('load', () => el(mode).style.setProperty('--ratio', el(mode).naturalWidth + '/' + el(mode).naturalHeight));
    el(mode + '-button').addEventListener('click', () => {
      el('zoom-label').textContent = (activeView[mode + 'Label'] || (mode === 'original' ? 'Original' : 'Remastered')) + ' · ' + current.title;
      el('zoom-image').src = activeView[mode];
      el('zoom').showModal();
    });
  }
  el('close-zoom').addEventListener('click', () => el('zoom').close());
  el('zoom').addEventListener('click', event => {
    if (event.target === el('zoom')) el('zoom').close();
  });
  const hash = location.hash.slice(1).split('/').map(decodeURIComponent);
  choose(byId.has(hash[0]) ? hash[0] : current.id, hash[1]);
})();

