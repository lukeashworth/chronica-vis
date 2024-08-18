
// Function to calculate circular positions
function calculateCircularPositions(centerX, centerY, radius, totalNodes) {
    const positions = [];
    for (let i = 0; i < totalNodes; i++) {
        const angle = (i / totalNodes) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        positions.push({
            x,
            y
        });
    }
    return positions;
}

const nodeStyles = {
    character: {
        color: {
            background: '#379683',
            border: '#28675B'
        },
        font: {
            color: '#FFFFFF'
        },
        shape: 'box',
        shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.5)',
            size: 10,
            x: 5,
            y: 5
        },
        shapeProperties: {
            borderRadius: 12
        }
    },
    npc: {
        shape: 'box',
        color: {
            background: '#557A95',
            border: '#415A73'
        },
        font: {
            color: '#FFFFFF'
        },
        shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.5)',
            size: 10,
            x: 5,
            y: 5
        },
        shapeProperties: {
            borderRadius: 12
        }
    },
    kinship: {
        color: {
            background: '#FFD700',
            border: '#E5B700'
        },
        font: {
            color: '#000000'
        },
        shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.5)',
            size: 10,
            x: 5,
            y: 5
        },
        shape: 'box',
        shapeProperties: {
            borderRadius: 6
        }
    },
};

// Create nodes and edges arrays
const nodes = [];
const edges = [];

function getNodeStyle(character, isKinship, isStandin) {
    if (character.player_id) { // Use player_id for identifying player characters
        return nodeStyles.character; // Player characters style
    } else if (isStandin) {
        return nodeStyles.kinship; // STANDIN characters get the kinship style
    } else if (isKinship) {
        return nodeStyles.kinship; // Kinship style for characters associated with a kinship
    } else {
        return nodeStyles.npc; // NPCs style
    }
}


// Define color constants
const RED_LOW_THREAT = "#FF9999";
const RED_MEDIUM_THREAT = "#FF4D4D";
const RED_HIGH_THREAT = "#B20000";

const GREEN_LOW_SUPPORT = "#99FF99";
const GREEN_MEDIUM_SUPPORT = "#4DFF4D";
const GREEN_HIGH_SUPPORT = "#00B200";

function getEdgeStyle(connection) {
    const t = connection.title.toLowerCase();

    // Direct mappings for specific keywords
    if (t.includes("rival")) return RED_HIGH_THREAT;
    if (t.includes("ally")) return GREEN_HIGH_SUPPORT;

    // Mappings for status levels
    const statusMap = {
        "+1": GREEN_LOW_SUPPORT,
        "+2": GREEN_MEDIUM_SUPPORT,
        "+3": GREEN_HIGH_SUPPORT,
        "-1": RED_LOW_THREAT,
        "-2": RED_MEDIUM_THREAT,
        "-3": RED_HIGH_THREAT
    };

    // Find and return the corresponding color if any status is found
    for (const [status, color] of Object.entries(statusMap)) {
        if (t.includes(status)) return color;
    }

    // Default return value if no match is found
    return "Status not recognized";
}
// Calculate positions for kinship nodes in a larger circle
const kinshipRadius = 500;
// Render all of the kinships
const kinshipPositions = calculateCircularPositions(0, 0, kinshipRadius, campaignData.campaign.kinships.length);

const createdNodes = []

function isIdInList(objectsList, idToCheck) {
    // Use the some() method to check if any object in the list has the idToCheck
    return objectsList.some(obj => obj.id === idToCheck);
}


campaignData.campaign.kinships.forEach((kinship, kinshipIndex) => {
    const kinshipCenter = kinshipPositions[kinshipIndex];

    // Get characters that belong to this kinship
    const kinshipCharacters = campaignData.campaign.characters.filter(character => {
        return character.konnections.some(k => k.kinship_id === kinship.id);
    });

    // Identify if there's a "STANDIN" character connected to this kinship
    const standinCharacter = kinshipCharacters.find(character => character.name.toLowerCase().includes("standin"));

    if (standinCharacter) {
        // Place the "STANDIN" character where the kinship node would have been
        if (!isIdInList(nodes, standinCharacter.id)) {
            nodes.push({
                id: standinCharacter.id,
                label: standinCharacter.name,
                ...getNodeStyle(standinCharacter, true, true), // Pass true for isStandin
                x: kinshipCenter.x,
                y: kinshipCenter.y,
                fixed: {
                    x: true,
                    y: true
                }
            });
        }
        // Calculate positions for other characters around the "STANDIN" character
        const characterRadius = 100;
        const characterPositions = calculateCircularPositions(kinshipCenter.x, kinshipCenter.y, characterRadius, kinshipCharacters.length);

        kinshipCharacters.forEach((character, i) => {
            if (character.id !== standinCharacter.id) {
                let position = characterPositions[i];
                if (!isIdInList(nodes, character.id)) {
                    nodes.push({
                        id: character.id,
                        label: character.name,
                        ...getNodeStyle(character, true, false), // Pass true for isKinship
                        x: position.x,
                        y: position.y,
                    });
                }

                // Connect them to the "STANDIN"
                edges.push({
                    from: standinCharacter.id,
                    to: character.id,
                    arrows: 'to, from',
                });
            }

            // Add connections between the other characters
            character.konnections.forEach(connection => {
                if (connection.character_alt_id) {
                    edges.push({
                        from: character.id,
                        to: connection.character_alt_id,
                        label: connection.preposition + " " + connection.title,
                        arrows: 'to, from',
                        color: {
                            color: getEdgeStyle(connection)
                        },

                    });
                }
            });
        });
    } else {
        // If no "STANDIN", render the kinship node and connect characters to it
	if (!isIdInList(nodes, `kinship_${kinship.id}`)) {
	        nodes.push({
	            id: `kinship_${kinship.id}`,
	            label: kinship.name,
	            ...getNodeStyle(kinship, true, false), // Pass true for isKinship
	            x: kinshipCenter.x,
	            y: kinshipCenter.y,
	            fixed: {
	                x: true,
	                y: true
	            }
	        });
	}

        // Calculate positions for characters within the kinship's circle
        const characterRadius = 100;
        const characterPositions = calculateCircularPositions(kinshipCenter.x, kinshipCenter.y, characterRadius, kinshipCharacters.length);

        kinshipCharacters.forEach((character, i) => {
            let position = characterPositions[i];
	    if (!isIdInList(nodes, character.id)) {
	            nodes.push({
	                id: character.id,
	                label: character.name,
	                ...getNodeStyle(character, true, false), // Pass true for isKinship
	                x: position.x,
	                y: position.y,
	            });
	    }

            // Add a red edge from the kinship to the character
            edges.push({
                from: `kinship_${kinship.id}`,
                to: character.id,
                arrows: 'to, from',
            });

            // Add edges based on other konnections
            character.konnections.forEach(connection => {
                if (connection.character_alt_id) {
                    edges.push({
                        from: character.id,
                        to: connection.character_alt_id,
                        label: connection.preposition + " " + connection.title,
                        arrows: 'to, from',
                        color: {
                            color: getEdgeStyle(connection)
                        },
                    });
                }
            });
        });
    }
});


// Add non-kinship characters to the center if needed
const nonKinshipNodes = campaignData.campaign.characters.filter(character => {
    return !character.konnections.some(k => k.kinship_id);
});

nonKinshipNodes.forEach(character => {
    if (!isIdInList(nodes, character.id)) {
	    nodes.push({
	        id: character.id,
	        label: character.name,
	        ...getNodeStyle(character, null),
	        x: 0,
	        y: 0
	    });
    }

    // Add edges based on konnections
    character.konnections.forEach(connection => {
        if (connection.character_alt_id) {
            edges.push({
                from: character.id,
                to: connection.character_alt_id,
                label: connection.preposition + " " + connection.title,
                arrows: 'to',
                color: {
                    color: getEdgeStyle(connection)
                },
            });
        }
    });
});

// Create a network
const container = document.getElementById('network');
const networkData = {
    nodes: new vis.DataSet(nodes),
    edges: new vis.DataSet(edges)
};
const options = {
    physics: {
        enabled: true,
        solver: "barnesHut",
        barnesHut: {
            gravitationalConstant: -30000,
            centralGravity: 0.1,
            springLength: 300,
            springConstant: 0.05,
            damping: 0.7,
            avoidOverlap: 1
        },
        stabilization: {
            enabled: true,
            iterations: 1000,
            updateInterval: 50,
            onlyDynamicEdges: false,
            fit: true
        },
        maxVelocity: 10,
        minVelocity: 0.1,
        timestep: 0.5,
        adaptiveTimestep: true
    },
    interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
        hover: true,
    },
    nodes: {
        borderWidth: 1,
        shape: 'ellipse',
        font: {
            size: 16
        },
        opacity: 1,
    },
    edges: {
        arrows: {
            to: {
                enabled: true,
                scaleFactor: 1
            },
        },
        font: {
            align: 'middle'
        },
        smooth: {
            type: 'continuous'
        },
        color: {
            color: '#848484',
            opacity: 1,
            inherit: false,
        }
    },
    manipulation: {
        enabled: true,
        initiallyActive: false
    },
};
const network = new vis.Network(container, networkData, options);
