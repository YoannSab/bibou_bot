// src/utils/helpers.js
function jaroWinklerDistance(s1, s2) {
    // Calcul de la longueur des deux chaînes
    const len1 = s1.length;
    const len2 = s2.length;

    // Calcul de la distance maximale
    const maxDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

    // Initialisation des variables
    let matches = 0;
    let transpositions = 0;
    // let prevPos = -1; // prevPos from original was not standard for Jaro-Winkler prefix

    // Création des tableaux de booléens pour les lettres déjà comparées
    const s1Matched = new Array(len1).fill(false);
    const s2Matched = new Array(len2).fill(false);

    // Recherche des caractères identiques dans les deux chaînes
    for (let i = 0; i < len1; i++) {
        const start = Math.max(0, i - maxDistance);
        const end = Math.min(i + maxDistance + 1, len2);

        for (let j = start; j < end; j++) {
            if (s2Matched[j]) {
                continue;
            }
            if (s1[i] !== s2[j]) {
                continue;
            }
            s1Matched[i] = true;
            s2Matched[j] = true;
            matches++;
            break;
        }
    }

    // Si aucune lettre ne correspond, la distance est de 0
    if (matches === 0) {
        return 0;
    }

    // Recherche des transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
        if (!s1Matched[i]) {
            continue;
        }
        while (!s2Matched[k]) {
            k++;
        }
        if (s1[i] !== s2[k]) {
            transpositions++;
        }
        // prevPos = k; // Not directly used in Jaro part like this
        k++;
    }
    transpositions /= 2; // Halve transpositions as each is counted twice

    // Calcul de la distance de Jaro
    const jaroDistance = (matches / len1 + matches / len2 + (matches - transpositions) / matches) / 3;

    // Calculation of common prefix for Jaro-Winkler
    let prefixLength = 0;
    for (let i = 0; i < Math.min(len1, len2, 4); i++) { // Limit prefix check to first 4 chars
        if (s1[i] === s2[i]) {
            prefixLength++;
        } else {
            break;
        }
    }
    const p = 0.1; // Standard prefix scaling factor

    const jaroWinkler = jaroDistance + (prefixLength * p * (1 - jaroDistance));

    return Math.round(jaroWinkler * 100);
}

module.exports = { jaroWinklerDistance };
