function render() {
    let campignData
    try {
        campaignData = JSON.parse(document.getElementById('myTextArea').value);
    } catch (e) {
        console.log(e)
    }

    if (!campaignData) return
    // Create nodes and edges arrays
    const nodes = [];
    const edges = [];

    // Function that takes campaignID and returns a function that takes characterID
    const fetchCharacterData = (campaignID) => (characterID) => {
        // Example logic for fetching character data
        return `https://chronica.ventures/campaigns/${campaignID}/characters/${characterID}`;
    };

    // Function that takes campaignID and returns a function that takes kinshipID
    const fetchKinshipData = (campaignID) => (kinshipID) => {
        // Example logic for fetching kinship data
        return `https://chronica.ventures/campaigns/${campaignID}/kinships/${kinshipID}`;
    };
    
     const fetchConnectionData = (campaignID) => (connectionID) => {
        // Example logic for fetching kinship data
        return `https://chronica.ventures/campaigns/${campaignID}/konnections/${connectionID}/edit`;
    };

    // Example usage
    let campaignID = campaignData.campaign.id
    // Step 1: Curried functions for a specific campaign
    const fetchForCampaignCharacter = fetchCharacterData(campaignID);
    const fetchForCampaignKinship = fetchKinshipData(campaignID);
    const fetchForCampaignConnection = fetchConnectionData(campaignID);
    
    // Calculate positions for kinship nodes in a larger circle
    const kinshipRadius = 800;
    // Render all of the kinships
    const kinshipPositions = calculateCircularPositions(0, 0, kinshipRadius, campaignData.campaign.kinships.length);

    const createdNodes = []

    function isIdInList(objectsList, idToCheck) {
        // Use the some() method to check if any object in the list has the idToCheck
        return objectsList.some(obj => obj.id === idToCheck);
    }


    // Render all of the kinships or kinship STANDIN
    campaignData.campaign.kinships.forEach((kinship, kinshipIndex) => {
        const kinshipCenter = kinshipPositions[kinshipIndex];
        // Get characters that belong to this kinship
        const characters = campaignData.campaign.characters.filter(character => {
            return character.konnections.some(k => k.kinship_id === kinship.id);
        });
        // Identify if there's a "STANDIN" character connected to this kinship
        const standinCharacter = characters.find(character => character.name.toLowerCase().includes("standin"));
				
        const externalURL = fetchForCampaignKinship(kinship.id)
        // Render all of the kinships
        if (standinCharacter) {
            // Place the "STANDIN" character where the kinship node would have been
            if (!isIdInList(nodes, standinCharacter.id)) {
                nodes.push({
                    id: standinCharacter.id,
                    label: replaceStringIgnoreCase(standinCharacter.name, "standin", ""),
                    ...getNodeStyle(standinCharacter, true), // Pass true for isStandin
                    x: kinshipCenter.x,
                    y: kinshipCenter.y,
                    fixed: {
                        x: true,
                        y: true
                    },
                    externalURL: externalURL
                });
            }
        } else {
            // If no "STANDIN", render the kinship node and connect characters to it
            if (!isIdInList(nodes, kinship.id)) {
                nodes.push({
                    id: kinship.id,
                    label: kinship.name,
                    ...getNodeStyle(kinship, true), // Pass true for isKinship
                    x: kinshipCenter.x,
                    y: kinshipCenter.y,
                    fixed: {
                        x: true,
                        y: true
                    },
                    externalURL: externalURL
                });
            }
        }
    });

    function findObjectById(objects, targetId) {
        return objects.find(obj => obj.id === targetId);
    }

    function replaceStringIgnoreCase(str, label, replacement) {
        const regex = new RegExp(label, "i");
        return str.replace(regex, replacement);
    }

    campaignData.campaign.characters.forEach((character, index) => {
        // Render the character node
        if (!isIdInList(nodes, character.id)) {
            nodes.push({
                id: character.id,
                label: character.name,
                ...getNodeStyle(character, false), // Pass true for isKinship
                // x: position.x,
                // y: position.y,
                externalURL: fetchForCampaignCharacter(character.id)
            });
        }

        // Render all of their edges
        // Add connections between the other characters
        character.konnections.forEach(connection => {
            // Check if the konnection is a connection that should go to a stand in instead of the kinship		
            let conID = connection.character_alt_id
            const kinshipID = connection.kinship_id
            // If this is connection to a kinship
            if (kinshipID) {
                const kinship = findObjectById(campaignData.campaign.kinships, kinshipID);

                // Get all of the characters that are related to this kinship
                const characters = campaignData.campaign.characters.filter(character => {
                    return character.konnections.some(k => k.kinship_id === kinship.id);
                });

                const nameComp = kinship.name.toLowerCase() + " standin"
                const standinCharacter = characters.find(character => character.name.toLowerCase() == nameComp);
                conID = standinCharacter.id
            }

            let label = connection.preposition + " " + connection.title
            if (label.startsWith('at')) {
                label = label.replace("at ", "");
            }

            if (character.id != conID) {
                edges.push({
                    from: character.id,
                    to: conID,
                    label: label,
                    arrows: 'to, from',
                    color: {
                        color: getEdgeStyle(connection),
                        hover:  getEdgeStyle(connection)
                    },
                    externalURL: fetchForCampaignConnection(connection.id)
                });
            }

        });
    })

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
            hoverConnectedEdges: false,
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
                opacity: 1,
                inherit: false,
            },
            length: 200,
        },
        manipulation: {
            enabled: true,
            initiallyActive: false
        },
        chosen: false
    };



    const network = new vis.Network(container, networkData, options);

    function cloneColorWithProperties(color, additionalProperties = {}) {
        return {
            ...color,
            ...additionalProperties // Merge in additional properties
        };
    }

    network.on('hoverNode', function(params) {
        const nodeId = params.node;
        const connectedEdges = network.getConnectedEdges(nodeId);
        const connectedNodes = new Set(network.getConnectedNodes(nodeId));
        connectedNodes.add(nodeId);

        const edgeUpdates = [];
        const nodeUpdates = [];

        // Update connected edges
        networkData.edges.forEach(function(edge) {
            const isConnected = connectedEdges.includes(edge.id);
            const updatedColor = isConnected ?
                cloneColorWithProperties(edge.color, {
                    opacity: 1.0
                }) :
                cloneColorWithProperties(edge.color, {
                    opacity: 0.2
                });

            edgeUpdates.push({
                id: edge.id,
                color: updatedColor
            });
        });

        // Update all nodes except the hovered node
        networkData.nodes.forEach(function(node) {
            if (node.id !== nodeId) {
                const opacity = connectedNodes.has(node.id) ? 1.0 : 0.1;
                nodeUpdates.push({
                    id: node.id,
                    opacity: opacity
                });
            }
        });

        // Apply updates in batches
        networkData.edges.update(edgeUpdates);
        networkData.nodes.update(nodeUpdates);
    });

    network.on('blurNode', function(params) {
        // Arrays to collect batch updates
        const edgeUpdates = [];
        const nodeUpdates = [];

        // Prepare edge updates to reset all edges to full opacity
        networkData.edges.forEach(function(edge) {
            const clonedColor = cloneColorWithProperties(edge.color, {
                opacity: 1.0
            });
            edgeUpdates.push({
                id: edge.id,
                color: clonedColor
            });
        });

        // Prepare node updates to reset all nodes to full opacity
        networkData.nodes.forEach(function(node) {
            nodeUpdates.push({
                id: node.id,
                opacity: 1.0
            });
        });

        // Apply the batch updates
        networkData.edges.update(edgeUpdates);
        networkData.nodes.update(nodeUpdates);
    });

    network.on('click', function(properties) {
        var nodeId = properties.nodes[0]; // Get the clicked node ID
        if (nodeId) {
            var clickedNode = networkData.nodes.get(nodeId); // Retrieve the node data
            const externalURL = clickedNode.externalURL 
            if (externalURL) {
                window.open(externalURL, '_blank'); // Open the node's URL in a new tab
            }
            return
        }
      	var edgeID = properties.edges[0]; // Get the clicked node ID
        if (edgeID) {
            var clickeEdge  = networkData.edges.get(edgeID); // Retrieve the node data
            const externalURL = clickeEdge.externalURL 
            if (externalURL) {
                window.open(externalURL, '_blank'); // Open the node's URL in a new tab
            }
            return
        }
    });
}

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
            border: '#28675B',
            hover: {
                background: '#379683',
                border: '#28675B'
            }
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
            border: '#415A73',
            hover: {
                background: '#557A95',
                border: '#415A73'
            }
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
            border: '#E5B700',
            hover: {
                background: '#FFD700',
                border: '#E5B700'
            }
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


function getNodeStyle(character, isKinship) {
    if (character.player_id) { // Use player_id for identifying player characters
        return nodeStyles.character; // Player characters style
    } else if (isKinship) {
        return nodeStyles.kinship; // Kinship style for characters associated with a kinship
    } else {
        return nodeStyles.npc; // NPCs style
    }
}


// Define color constants
const RED_LOW_THREAT = "#FF6666";
const RED_MEDIUM_THREAT = "#FF4D4D";
const RED_HIGH_THREAT = "#B20000";

const GREEN_LOW_SUPPORT = "#99FF99";
const GREEN_MEDIUM_SUPPORT = "#4DFF4D";
const GREEN_HIGH_SUPPORT = "#00B200";

function getEdgeStyle(connection) {
    const t = connection.title.toLowerCase();

    // Direct mappings for specific keywords
    if (t.includes("rival")) {
        return RED_HIGH_THREAT;
    }
    if (t.includes("ally")) {
        return GREEN_HIGH_SUPPORT;
    }
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
        if (t.includes(status)) {
            return color;
        }
    }

    // Default return value if no match is found
    return "#A9A9A9"
}
