const removedItemIds = new Set();

async function processFiles() {
  const file1Input = document.getElementById("file1");
  const file2Input = document.getElementById("file2");
  const filterMode = document.getElementById("filterMode").value;
  const file1 = file1Input.files[0];
  const file2 = file2Input.files[0];

  if (!file1 || !file2) {
    alert("Please upload both files.");
    return;
  }

  document.getElementById("label1").textContent = file1.name;
  document.getElementById("label2").textContent = file2.name;

  document.getElementById("grid1").innerHTML = "<p>Loading...</p>";
  document.getElementById("grid2").innerHTML = "<p>Loading...</p>";

  try {
    const [ids1, ids2] = await Promise.all([readJSON(file1), readJSON(file2)]);
    const itemMap = await getItemMapping();
    window.globalItemMap = itemMap;
    window.globalIds1 = ids1;
    window.globalIds2 = ids2;

    renderItemGrids();
  } catch (err) {
    console.error("Error processing files:", err);
    alert(
      "Something went wrong while loading item data. Check the console for details."
    );
  }
}

document.getElementById("filterMode").addEventListener("change", () => {
  const file1 = document.getElementById("file1").files[0];
  const file2 = document.getElementById("file2").files[0];
  if (file1 && file2) {
    processFiles();
  }
});

document.getElementById("file1").addEventListener("change", () => {
  const file2 = document.getElementById("file2").files[0];
  if (file2) processFiles();
});

document.getElementById("file2").addEventListener("change", () => {
  const file1 = document.getElementById("file1").files[0];
  if (file1) processFiles();
});

function readJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) resolve(data);
        else reject("Invalid JSON structure.");
      } catch (err) {
        reject("Error parsing JSON: " + err);
      }
    };
    reader.readAsText(file);
  });
}

async function getItemMapping() {
  const res = await fetch("https://prices.runescape.wiki/api/v1/osrs/mapping");
  const allItems = await res.json();
  const map = {};
  for (const item of allItems) {
    map[item.id] = {
      id: item.id,
      name: item.name,
      icon: `https://oldschool.runescape.wiki/images/${encodeURIComponent(
        item.name.replace(/ /g, "_")
      )}_detail.png`,
    };
  }
  return map;
}

function addItemToGrid(gridOrId, item, id, isShared = false) {
  const div = document.createElement("div");
  div.className = "item";
  div.classList.add(isShared ? "shared" : "nonshared");

  const wikiName = encodeURIComponent(item.name.replace(/ /g, "_"));
  const wikiUrl = `https://oldschool.runescape.wiki/w/${wikiName.replace(
    /'/g,
    "%27"
  )}`;
  const removeToggle = document.getElementById("removeToggle");

  div.innerHTML = `
    <div class="item-image-wrapper">
      <a href="#" onclick="handleItemClick(${id}, '${wikiUrl}'); return false;" style="text-decoration: none; color: inherit;">
        <img src="${item.icon}" onerror="this.onerror=null; this.src='https://chisel.weirdgloop.org/static/img/osrs-sprite/${id}.png';">
        <br>${item.name}
      </a>
    </div>
    <button class="item-id-btn" onclick="copyToClipboard(${id}, this)">Copy ID: ${id}</button>
  `;

  const container =
    typeof gridOrId === "string" ? document.getElementById(gridOrId) : gridOrId;

  if (container) container.appendChild(div);
}

document.getElementById("searchInput").addEventListener("input", () => {
  const query = document.getElementById("searchInput").value.toLowerCase();

  document.querySelectorAll(".item").forEach((item) => {
    const name = item.textContent.toLowerCase();
    item.style.display = name.includes(query) ? "" : "none";
  });
});

function copyToClipboard(id, button) {
  navigator.clipboard
    .writeText(id.toString())
    .then(() => {
      button.textContent = "Copied!";
      setTimeout(() => {
        button.textContent = `Copy ID: ${id}`;
      }, 1000);
    })
    .catch((err) => {
      console.error("Failed to copy ID:", err);
    });
}

function handleItemClick(id, wikiUrl) {
  const removeToggle = document.getElementById("removeToggle");
  if (removeToggle.checked) {
    if (!removedItemIds.has(id)) {
      removedItemIds.add(id);
      updateRemovedListDisplay();
      renderItemGrids();
    }
  } else {
    window.open(wikiUrl, "_blank");
  }
}

function updateRemovedListDisplay() {
  const container = document.getElementById("removedList");
  container.innerHTML = "";

  const set1 = new Set(globalIds1);
  const set2 = new Set(globalIds2);

  const shared = [];
  const unshared = [];

  for (const id of removedItemIds) {
    if (set1.has(id) && set2.has(id)) {
      shared.push(id);
    } else {
      unshared.push(id);
    }
  }

  const ordered = [...shared, ...unshared];

  for (const id of ordered) {
    const item = globalItemMap[id];
    if (!item) continue;

    const isShared = set1.has(id) && set2.has(id);

    const div = document.createElement("div");
    div.className = "item";
    div.classList.add(isShared ? "shared" : "nonshared");

    div.innerHTML = `
      <div class="item-image-wrapper">
        <a href="#" onclick="removeFromRemovedList(${id}); return false;" style="text-decoration: none; color: inherit;">
          <img src="${item.icon}" onerror="this.onerror=null; this.src='https://chisel.weirdgloop.org/static/img/osrs-sprite/${id}.png';">
          <br>${item.name}
        </a>
      </div>
      <button class="item-id-btn" onclick="copyToClipboard(${id}, this)">Copy ID: ${id}</button>
    `;

    container.appendChild(div);
  }
}

function removeFromRemovedList(id) {
  if (removedItemIds.has(id)) {
    removedItemIds.delete(id);
    updateRemovedListDisplay();
    renderItemGrids();
  }
}

async function exportRemovedList() {
  const jsonData = JSON.stringify(Array.from(removedItemIds), null, 2);
  const fileName = "chanceman_removed_items.json";

  if (window.showSaveFilePicker) {
    try {
      const options = {
        suggestedName: fileName,
        types: [
          {
            description: "JSON file",
            accept: { "application/json": [".json"] },
          },
        ],
      };

      const handle = await window.showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(jsonData);
      await writable.close();
      alert("Removed items saved successfully.");
      return;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Save dialog failed:", err);
        alert("An error occurred while saving the file.");
      }
      return;
    }
  }

  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderItemGrids() {
  const scrollY = window.scrollY;

  const filterMode = document.getElementById("filterMode").value;
  if (!globalItemMap || !globalIds1 || !globalIds2) return;

  const set1 = new Set(globalIds1);
  const set2 = new Set(globalIds2);
  const shared = globalIds1.filter((id) => set2.has(id));
  const only1 = globalIds1.filter((id) => !set2.has(id));
  const only2 = globalIds2.filter((id) => !set1.has(id));

  const container1 = document.getElementById("grid1");
  const container2 = document.getElementById("grid2");
  container1.innerHTML = "";
  container2.innerHTML = "";

  let ordered1 = [],
    ordered2 = [];

  if (filterMode === "shared") {
    ordered1 = shared;
    ordered2 = shared;
  } else if (filterMode === "unshared") {
    ordered1 = only1;
    ordered2 = only2;
  } else {
    ordered1 = [...shared, ...only1];
    ordered2 = [...shared, ...only2];
  }

  ordered1 = ordered1.filter((id) => !removedItemIds.has(id));
  ordered2 = ordered2.filter((id) => !removedItemIds.has(id));

  for (const id of ordered1) {
    const item = globalItemMap[id];
    if (item) {
      const isShared = shared.includes(id);
      addItemToGrid(container1, item, id, isShared);
    }
  }

  for (const id of ordered2) {
    const item = globalItemMap[id];
    if (item) {
      const isShared = shared.includes(id);
      addItemToGrid(container2, item, id, isShared);
    }
  }

  window.scrollTo({ top: scrollY });

  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  if (searchTerm) {
    document.querySelectorAll(".item").forEach((item) => {
      const name = item.textContent.toLowerCase();
      item.style.display = name.includes(searchTerm) ? "" : "none";
    });
  }
}

document.getElementById("file3").addEventListener("change", async (e) => {
  if (!window.globalIds1 || !window.globalIds2 || !window.globalItemMap) {
    alert(
      "Please upload the two item files before importing a removed items file."
    );
    return;
  }

  const file = e.target.files[0];
  if (!file) return;

  try {
    const importedIdsRaw = await readJSON(file);
    if (!Array.isArray(importedIdsRaw)) {
      alert("Invalid format. Please upload a JSON array of item IDs.");
      return;
    }

    const importedIds = importedIdsRaw.map((id) => Number(id));
    let addedCount = 0;

    for (const id of importedIds) {
      if (!removedItemIds.has(id)) {
        removedItemIds.add(id);
        addedCount++;
      }
    }

    updateRemovedListDisplay();
    renderItemGrids();
  } catch (err) {
    console.error("Failed to import removed items:", err);
    alert("Error importing JSON: " + err);
  }
});
