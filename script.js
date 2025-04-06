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

    const set1 = new Set(ids1);
    const set2 = new Set(ids2);

    const shared = ids1.filter((id) => set2.has(id));
    const only1 = ids1.filter((id) => !set2.has(id));
    const only2 = ids2.filter((id) => !set1.has(id));

    document.getElementById("grid1").innerHTML = "";
    document.getElementById("grid2").innerHTML = "";

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

    for (const id of ordered1) {
      const item = itemMap[id];
      if (item) {
        const isShared = shared.includes(id);
        addItemToGrid("grid1", item, id, isShared);
      }
    }

    for (const id of ordered2) {
      const item = itemMap[id];
      if (item) {
        const isShared = shared.includes(id);
        addItemToGrid("grid2", item, id, isShared);
      }
    }
  } catch (err) {
    console.error("Error processing files:", err);
    alert(
      "Something went wrong while loading item data. Check the console for details."
    );
  }
}

document.getElementById("filterMode").addEventListener("change", () => {
  // Only trigger if files have already been selected
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
      name: item.name,
      icon: `https://oldschool.runescape.wiki/images/${encodeURIComponent(
        item.name.replace(/ /g, "_")
      )}_detail.png`,
    };
  }
  return map;
}

function addItemToGrid(gridId, item, id, isShared = false) {
  const div = document.createElement("div");
  div.className = "item";
  if (isShared) div.classList.add("shared");
  div.dataset.id = id; // Store the ID in a data attribute
  div.title = `Item ID: ${id}`; // Show ID on hover

  // Link to OSRS Wiki (URL-safe item name)
  const wikiName = encodeURIComponent(item.name.replace(/ /g, "_"));
  const wikiUrl = `https://oldschool.runescape.wiki/w/${wikiName}`;

  div.innerHTML = `
<a href="${wikiUrl}" target="_blank" style="text-decoration: none; color: inherit;">
  <img src="${item.icon}" alt="${item.name}"><br>
  ${item.name}
</a>    
`;

  document.getElementById(gridId).appendChild(div);
}

document.getElementById("searchInput").addEventListener("input", () => {
  const query = document.getElementById("searchInput").value.toLowerCase();

  document.querySelectorAll(".item").forEach((item) => {
    const name = item.textContent.toLowerCase();
    item.style.display = name.includes(query) ? "" : "none";
  });
});
