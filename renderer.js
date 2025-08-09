document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('table-body');
    const formAjoutCentre = document.getElementById('form-ajout-centre');
    const formAjoutVehicule = document.getElementById('form-ajout-vehicule');
    const formParamEffectifs = document.getElementById('form-param-effectifs');
    const centreSelect = document.getElementById('centre-vehicule');
    const paramEffectifsContainer = document.getElementById('param-effectifs-container');

    let data = null;

    // Chargement initial des données
    async function loadData() {
        data = await window.electronAPI.getData();
        if (!data.departements) data.departements = {};
        if (!data.effectifsParType) data.effectifsParType = {};
        renderTable();
        populateCentreSelect();
        renderEffectifsParams();
    }

    // Affichage tableau
    function renderTable() {
        tableBody.innerHTML = '';

        for (const dep in data.departements) {
            const depData = data.departements[dep];
            depData.centres.forEach(centre => {
                centre.vehicules.forEach(vehicule => {
                    const tr = document.createElement('tr');

                    // Département
                    let tdDep = document.createElement('td');
                    tdDep.textContent = dep;
                    tr.appendChild(tdDep);

                    // Caserne
                    let tdCentre = document.createElement('td');
                    tdCentre.textContent = centre.nom;
                    tr.appendChild(tdCentre);

                    // Besoin = effectif de base
                    let tdBesoin = document.createElement('td');
                    tdBesoin.textContent = vehicule.effectifBase;
                    tr.appendChild(tdBesoin);

                    // Effectif actuel = pour le moment égal au besoin (pas d'info en direct)
                    let tdEffectif = document.createElement('td');
                    tdEffectif.textContent = vehicule.effectifBase;
                    tr.appendChild(tdEffectif);

                    // Statut (simple)
                    let tdStatut = document.createElement('td');
                    tdStatut.textContent = vehicule.effectifBase >= data.effectifsParType[vehicule.type] ? 'OK' : 'ALERTE';
                    tdStatut.className = (tdStatut.textContent === 'OK') ? 'ok' : 'alert';
                    tr.appendChild(tdStatut);

                    tableBody.appendChild(tr);
                });
            });
        }
    }

    // Remplissage liste centres dans formulaire véhicule
    function populateCentreSelect() {
        centreSelect.innerHTML = '<option value="">-- Choisissez --</option>';
        // Pour tous départements avec centres, rajouter option sous forme dep|centreNom (pour récupérer)
        for (const dep in data.departements) {
            data.departements[dep].centres.forEach(centre => {
                const option = document.createElement('option');
                option.value = `${dep}|${centre.nom}`;
                option.textContent = `${dep} - ${centre.nom}`;
                centreSelect.appendChild(option);
            });
        }
    }

    // Ajout centre
    formAjoutCentre.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dep = formAjoutCentre['dep-centre'].value.trim();
        const nom = formAjoutCentre['nom-centre'].value.trim();

        if (!dep || !nom) return alert("Merci de remplir tous les champs");

        if (!data.departements[dep]) {
            data.departements[dep] = { centres: [] };
        }
        // Vérifier doublon
        if (data.departements[dep].centres.find(c => c.nom.toLowerCase() === nom.toLowerCase())) {
            return alert("Ce centre existe déjà dans ce département");
        }

        data.departements[dep].centres.push({
            nom,
            vehicules: []
        });

        await window.electronAPI.saveData(data);
        formAjoutCentre.reset();
        populateCentreSelect();
        renderTable();
        alert("Centre ajouté");
    });

    // Ajout véhicule
    formAjoutVehicule.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dep = formAjoutVehicule['dep-vehicule'].value.trim();
        const centreValue = formAjoutVehicule['centre-vehicule'].value;
        const type = formAjoutVehicule['type-vehicule'].value.trim();
        const effectifBase = parseInt(formAjoutVehicule['effectif-vehicule'].value, 10);

        if (!dep || !centreValue || !type || isNaN(effectifBase)) return alert("Merci de remplir tous les champs");

        if (!data.departements[dep]) {
            return alert("Département introuvable");
        }

        const [depSelect, nomCentre] = centreValue.split('|');
        if (depSelect !== dep) return alert("Le département sélectionné ne correspond pas au centre");

        const centre = data.departements[dep].centres.find(c => c.nom === nomCentre);
        if (!centre) return alert("Centre introuvable");

        // Vérifier doublon véhicule (type)
        if (centre.vehicules.find(v => v.type.toLowerCase() === type.toLowerCase())) {
            return alert("Ce type de véhicule existe déjà dans ce centre");
        }

        centre.vehicules.push({
            type,
            effectifBase
        });

        // Si type véhicule inconnu dans effectifsParType, l'ajouter par défaut à 1
        if (!(type in data.effectifsParType)) {
            data.effectifsParType[type] = 1;
        }

        await window.electronAPI.saveData(data);
        formAjoutVehicule.reset();
        renderTable();
        renderEffectifsParams();
        alert("Véhicule ajouté");
    });

    // Affichage des paramètres effectifs par type
    function renderEffectifsParams() {
        paramEffectifsContainer.innerHTML = '';
        for (const type in data.effectifsParType) {
            const div = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = `Effectif requis pour "${type}" :`;
            label.setAttribute('for', `effectif-${type}`);

            const input = document.createElement('input');
            input.type = 'number';
            input.id = `effectif-${type}`;
            input.name = type;
            input.min = 1;
            input.max = 20;
            input.value = data.effectifsParType[type];

            div.appendChild(label);
            div.appendChild(input);
            paramEffectifsContainer.appendChild(div);
        }
    }

    // Sauvegarder paramètres
    formParamEffectifs.addEventListener('submit', async (e) => {
        e.preventDefault();

        const inputs = paramEffectifsContainer.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            const type = input.name;
            const val = parseInt(input.value, 10);
            if (!isNaN(val) && val > 0) {
                data.effectifsParType[type] = val;
            }
        });

        await window.electronAPI.saveData(data);
        renderTable();
        alert("Paramètres enregistrés");
    });

    // Quand on change le département dans ajout véhicule, mettre à jour la liste centres correspondante
    document.getElementById('dep-vehicule').addEventListener('input', (e) => {
        const dep = e.target.value.trim();
        centreSelect.innerHTML = '<option value="">-- Choisissez --</option>';
        if (data.departements[dep]) {
            data.departements[dep].centres.forEach(centre => {
                const option = document.createElement('option');
                option.value = `${dep}|${centre.nom}`;
                option.textContent = `${dep} - ${centre.nom}`;
                centreSelect.appendChild(option);
            });
        }
    });

    loadData();
});
