/////////////////////////////////////////////////////
//////////       ALIEN CUSTOMS GAME      ////////////
/////////////////////////////////////////////////////

/*
  This project uses PeerJS so browsers can talk directly to each other.

  The Host is authoritative:
  - Agents receive aliens from the Host.
  - Agents only send selected alien IDs back to the Host.
  - The Host checks every alien before accepting it.
  - The Host broadcasts quota and progress updates.
*/

var createGameButton = document.getElementById("createGameButton");
var showJoinFormButton = document.getElementById("showJoinFormButton");
var backToWelcomeFromJoinButton = document.getElementById("backToWelcomeFromJoinButton");
var joinForm = document.getElementById("joinForm");
var agentNameInput = document.getElementById("agentNameInput");
var hostIdInput = document.getElementById("hostIdInput");
var connectionStatus = document.getElementById("connectionStatus");

var welcomeScreen = document.getElementById("welcomeScreen");
var hostScreen = document.getElementById("hostScreen");
var agentScreen = document.getElementById("agentScreen");
var gameOverScreen = document.getElementById("gameOverScreen");

var hostRoomId = document.getElementById("hostRoomId");
var copyRoomIdButton = document.getElementById("copyRoomIdButton");
var hostMainPageButton = document.getElementById("hostMainPageButton");
var startGameButton = document.getElementById("startGameButton");
var generateRequestButton = document.getElementById("generateRequestButton");
var resetGameButton = document.getElementById("resetGameButton");
var hostRequestText = document.getElementById("hostRequestText");
var hostQuotaText = document.getElementById("hostQuotaText");
var hostStatusMessage = document.getElementById("hostStatusMessage");
var hostPlayerList = document.getElementById("hostPlayerList");
var hostSubmissionList = document.getElementById("hostSubmissionList");

var agentRemainingBadge = document.getElementById("agentRemainingBadge");
var agentRequestText = document.getElementById("agentRequestText");
var agentQuotaText = document.getElementById("agentQuotaText");
var agentSubmissionStatus = document.getElementById("agentSubmissionStatus");
var agentPlayerList = document.getElementById("agentPlayerList");
var selectedCountText = document.getElementById("selectedCountText");
var sendSelectedButton = document.getElementById("sendSelectedButton");
var alienTableBody = document.getElementById("alienTableBody");
var gameOverMainPageButton = document.getElementById("gameOverMainPageButton");
var gameOverMessage = document.getElementById("gameOverMessage");

var alienNames = [];
var alienSpecies = [];
var eyeColours = [];
var professions = [];
var hazards = [];
var purposes = [];
var generationSettings = {
  aliensPerAgent: 20,
  minimumEyes: 1,
  maximumEyes: 8,
  minimumHeightMetres: 0.7,
  maximumHeightMetres: 3,
  minimumEarthRequestSpaces: 5,
  maximumEarthRequestSpaces: 10,
  heightRequestThresholds: [1.2, 1.5, 1.8, 2.0, 2.2]
};
var alienDataLoaded = false;

var peer = null;
var hostConnection = null;
var currentRole = "";
var currentAgentName = "";
var localAgentAliens = [];
var selectedAlienIds = [];
var buttonClickSound = new Audio("assets/sounds/buttonClick.mp3");
var alienSelectSound = new Audio("assets/sounds/alien-select.mp3");
buttonClickSound.preload = "auto";
alienSelectSound.preload = "auto";

var hostGameState = makeEmptyHostGameState();

/////////////////////////////////////////////////////
//////////       LOAD JSON DATA          ////////////
/////////////////////////////////////////////////////

function loadAlienDataFromJson() {
  createGameButton.disabled = true;
  showJoinFormButton.disabled = true;
  setConnectionStatus("Loading alien data...");

  fetch("./data.json")
    .then(function(response) {
      if (response.ok === false) {
        throw new Error("Could not load data.json");
      }

      return response.json();
    })
    .then(function(data) {
      if (Array.isArray(data.alienNames) === false || data.alienNames.length === 0) {
        throw new Error("data.json needs an alienNames array.");
      }

      if (Array.isArray(data.alienSpecies) === false || data.alienSpecies.length === 0) {
        throw new Error("data.json needs an alienSpecies array.");
      }

      if (Array.isArray(data.eyeColours) === false || data.eyeColours.length === 0) {
        throw new Error("data.json needs an eyeColours array.");
      }

      if (Array.isArray(data.professions) === false || data.professions.length === 0) {
        throw new Error("data.json needs a professions array.");
      }

      if (Array.isArray(data.hazards) === false || data.hazards.length === 0) {
        throw new Error("data.json needs a hazards array.");
      }

      if (Array.isArray(data.purposes) === false || data.purposes.length === 0) {
        throw new Error("data.json needs a purposes array.");
      }

      alienNames = data.alienNames;
      alienSpecies = data.alienSpecies;
      eyeColours = data.eyeColours;
      professions = data.professions;
      hazards = data.hazards;
      purposes = data.purposes;

      if (data.generationSettings !== undefined) {
        copyGenerationSettingsFromJson(data.generationSettings);
      }

      alienDataLoaded = true;
      createGameButton.disabled = false;
      showJoinFormButton.disabled = false;
      setConnectionStatus("Alien data ready");
    })
    .catch(function(error) {
      console.error(error);
      setConnectionStatus("Could not load data.json. Start the game from a local server.");
    });
}

function copyGenerationSettingsFromJson(settingsFromJson) {
  var settingNames = Object.keys(generationSettings);

  for (var index = 0; index < settingNames.length; index = index + 1) {
    var settingName = settingNames[index];

    if (settingsFromJson[settingName] !== undefined) {
      generationSettings[settingName] = settingsFromJson[settingName];
    }
  }
}

function isAlienDataReady() {
  if (alienDataLoaded === false) {
    setConnectionStatus("Alien data is still loading.");
    return false;
  }

  return true;
}

/////////////////////////////////////////////////////
//////////       GENERAL UI HELPERS      ////////////
/////////////////////////////////////////////////////

function showOnlyScreen(screenToShow) {
  welcomeScreen.classList.remove("active");
  hostScreen.classList.remove("active");
  agentScreen.classList.remove("active");
  gameOverScreen.classList.remove("active");

  screenToShow.classList.add("active");
}

function makeEmptyHostGameState() {
  return {
    hasStarted: false,
    gameOver: false,
    currentRequest: null,
    remainingSpaces: 0,
    currentRequestSubmissions: {},
    agents: {}
  };
}

function resetWelcomeScreen() {
  createGameButton.classList.remove("hidden");
  showJoinFormButton.classList.remove("hidden");
  joinForm.classList.add("hidden");
  agentNameInput.value = "";
  hostIdInput.value = "";
}

function hideAgentRoundDetails() {
  agentQuotaText.classList.add("hidden");
  agentSubmissionStatus.classList.add("hidden");
}

function showAgentRoundDetails() {
  agentQuotaText.classList.remove("hidden");
  agentSubmissionStatus.classList.remove("hidden");
}

function hideHostQuota() {
  hostQuotaText.classList.add("hidden");
}

function showHostQuota() {
  hostQuotaText.classList.remove("hidden");
}

function returnToMainPage() {
  if (currentRole === "host") {
    broadcastToAgents({
      type: "host-reset",
      message: "The host returned to the main page."
    });
  }

  if (peer !== null) {
    peer.destroy();
  }

  peer = null;
  hostConnection = null;
  currentRole = "";
  currentAgentName = "";
  localAgentAliens = [];
  selectedAlienIds = [];
  hostGameState = makeEmptyHostGameState();

  hostRoomId.textContent = "----";
  hostRequestText.textContent = "Waiting to start.";
  hostQuotaText.textContent = "No active Earth request.";
  hideHostQuota();
  hostStatusMessage.textContent = "Share the room ID with agents.";
  copyRoomIdButton.disabled = false;
  hostPlayerList.innerHTML = "";
  renderHostPlayerList();
  renderHostSubmissionList();

  agentRequestText.textContent = "Waiting for the host to start.";
  agentQuotaText.textContent = "No active quota.";
  agentSubmissionStatus.textContent = "No submission yet.";
  hideAgentRoundDetails();
  agentPlayerList.innerHTML = "";
  alienTableBody.innerHTML = "";
  updateAgentRemainingBadge();
  updateSelectedCount();

  resetWelcomeScreen();
  setConnectionStatus("Not connected");
  showOnlyScreen(welcomeScreen);
}

function setConnectionStatus(message) {
  connectionStatus.textContent = message;

  if (message === "Not connected" || message === "Loading alien data..." || message === "Alien data ready") {
    connectionStatus.classList.add("hidden");
  } else {
    connectionStatus.classList.remove("hidden");
  }
}

function playButtonClickSound() {
  buttonClickSound.currentTime = 0;

  var playPromise = buttonClickSound.play();

  if (playPromise !== undefined) {
    playPromise.catch(function(error) {
      console.warn("Button click sound could not play:", error);
    });
  }
}

function playAlienSelectSound() {
  alienSelectSound.currentTime = 0;

  var playPromise = alienSelectSound.play();

  if (playPromise !== undefined) {
    playPromise.catch(function(error) {
      console.warn("Alien selection sound could not play:", error);
    });
  }
}

function flashRequirementText(requirementElement) {
  requirementElement.classList.remove("requirement-flash");

  /*
    Removing and re-adding the class restarts the animation.
    requestAnimationFrame gives the browser one beat to notice the reset.
  */
  requestAnimationFrame(function() {
    requirementElement.classList.add("requirement-flash");
  });
}

function showTemporaryHostStatus(message) {
  hostStatusMessage.textContent = message;
}

function makeSafePlayerName(name) {
  var trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return "Unnamed Agent";
  }

  return trimmedName;
}

function getRandomInteger(minimum, maximum) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function getRandomItem(list) {
  var randomIndex = getRandomInteger(0, list.length - 1);
  return list[randomIndex];
}

function makeRoomId() {
  var roomCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var roomCode = "AC-";

  for (var index = 0; index < 4; index = index + 1) {
    roomCode = roomCode + getRandomItem(roomCharacters);
  }

  return roomCode;
}

function makeUniqueId(prefix) {
  var randomNumber = Math.floor(Math.random() * 1000000000);
  return prefix + "-" + Date.now() + "-" + randomNumber;
}

/////////////////////////////////////////////////////
//////////       ALIEN GENERATION        ////////////
/////////////////////////////////////////////////////

function generateAlien() {
  var minimumHeightCentimetres = Math.round(generationSettings.minimumHeightMetres * 100);
  var maximumHeightCentimetres = Math.round(generationSettings.maximumHeightMetres * 100);
  var heightInCentimetres = getRandomInteger(minimumHeightCentimetres, maximumHeightCentimetres);
  var heightInMetres = heightInCentimetres / 100;

  return {
    id: makeUniqueId("alien"),
    name: getRandomItem(alienNames),
    species: getRandomItem(alienSpecies),
    numberOfEyes: getRandomInteger(generationSettings.minimumEyes, generationSettings.maximumEyes),
    eyeColour: getRandomItem(eyeColours),
    hasTentacles: Math.random() >= 0.5,
    height: heightInMetres,
    profession: getRandomItem(professions),
    hazard: getRandomItem(hazards),
    purpose: getRandomItem(purposes)
  };
}

function generateAlienManifest(totalAliens) {
  var aliens = [];

  for (var alienNumber = 0; alienNumber < totalAliens; alienNumber = alienNumber + 1) {
    aliens.push(generateAlien());
  }

  return aliens;
}

/////////////////////////////////////////////////////
//////////       EARTH REQUESTS          ////////////
/////////////////////////////////////////////////////

function generateEarthRequest() {
  var requestTypes = [
    "profession",
    "eyeColour",
    "heightGreaterThan",
    "species",
    "hasTentacles",
    "numberOfEyes",
    "nameStartsWith",
    "hazard",
    "purpose",
    "dangerousMilitaryProgramme",
    "eyeColourAndHeight"
  ];

  var requestType = getRandomItem(requestTypes);
  var spacesAvailable = getRandomInteger(
    generationSettings.minimumEarthRequestSpaces,
    generationSettings.maximumEarthRequestSpaces
  );

  if (isCompoundRequestType(requestType) === true) {
    spacesAvailable = getRandomInteger(2, 5);
  }

  var request = {
    id: makeUniqueId("request"),
    type: requestType,
    value: null,
    spaces: spacesAvailable,
    description: "",
    conditions: []
  };

  if (requestType === "profession") {
    request.value = getRandomItem(professions);
    request.description = "Earth is accepting " + spacesAvailable + " " + request.value + "s.";
    request.conditions.push({
      trait: "profession",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "eyeColour") {
    request.value = getRandomItem(eyeColours);
    request.description = "Earth is accepting " + spacesAvailable + " aliens with " + request.value.toLowerCase() + " eyes.";
    request.conditions.push({
      trait: "eyeColour",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "heightGreaterThan") {
    request.value = getRandomItem(generationSettings.heightRequestThresholds);
    request.description = "Earth is accepting " + spacesAvailable + " aliens taller than " + request.value + " metres.";
    request.conditions.push({
      trait: "height",
      comparison: "greaterThan",
      value: request.value
    });
  }

  if (requestType === "species") {
    request.value = getRandomItem(alienSpecies);
    request.description = "Earth is accepting " + spacesAvailable + " " + request.value + "s.";
    request.conditions.push({
      trait: "species",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "hasTentacles") {
    request.value = Math.random() >= 0.5;

    if (request.value === true) {
      request.description = "Earth is accepting " + spacesAvailable + " aliens with tentacles.";
    } else {
      request.description = "Earth is accepting " + spacesAvailable + " aliens without tentacles.";
    }

    request.conditions.push({
      trait: "hasTentacles",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "numberOfEyes") {
    request.value = getRandomInteger(generationSettings.minimumEyes, generationSettings.maximumEyes);
    request.description = "Earth is accepting " + spacesAvailable + " aliens with " + request.value + " eyes.";
    request.conditions.push({
      trait: "numberOfEyes",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "nameStartsWith") {
    request.value = getRandomAlienNameFirstLetter();
    request.description = "Earth is accepting " + spacesAvailable + " aliens whose name starts with " + request.value + ".";
    request.conditions.push({
      trait: "name",
      comparison: "startsWith",
      value: request.value
    });
  }

  if (requestType === "hazard") {
    request.value = getRandomItem(hazards);
    request.description = "Earth is accepting " + spacesAvailable + " aliens marked " + request.value + " level.";
    request.conditions.push({
      trait: "hazard",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "purpose") {
    request.value = getRandomItem(purposes);
    request.description = "Earth is accepting " + spacesAvailable + " aliens coming for " + request.value + ".";
    request.conditions.push({
      trait: "purpose",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "dangerousMilitaryProgramme") {
    request.value = "Dangerous";
    request.spaces = 3;
    request.description = "Earth urgently requires 3 Dangerous aliens for its military programme.";
    request.conditions.push({
      trait: "hazard",
      comparison: "equals",
      value: "Dangerous"
    });
  }

  if (requestType === "eyeColourAndHeight") {
    var requestedEyeColour = getRandomItem(eyeColours);
    var requestedHeight = getRandomItem(generationSettings.heightRequestThresholds);

    request.value = requestedEyeColour;
    request.description = "Earth requests " + spacesAvailable + " aliens with " + requestedEyeColour.toLowerCase() + " eyes taller than " + requestedHeight + " metres.";
    request.conditions.push({
      trait: "eyeColour",
      comparison: "equals",
      value: requestedEyeColour
    });
    request.conditions.push({
      trait: "height",
      comparison: "greaterThan",
      value: requestedHeight
    });
  }

  return request;
}

function isCompoundRequestType(requestType) {
  var compoundRequestTypes = [
    "eyeColourAndHeight"
  ];

  return compoundRequestTypes.indexOf(requestType) !== -1;
}

function getRandomAlienNameFirstLetter() {
  var availableLetters = [];

  for (var index = 0; index < alienNames.length; index = index + 1) {
    var alienName = alienNames[index];
    var firstLetter = alienName.charAt(0).toUpperCase();

    if (firstLetter.length > 0 && availableLetters.indexOf(firstLetter) === -1) {
      availableLetters.push(firstLetter);
    }
  }

  return getRandomItem(availableLetters);
}

function doesAlienMatchRequest(alien, request) {
  if (request === null) {
    return false;
  }

  if (Array.isArray(request.conditions) === true && request.conditions.length > 0) {
    return doesAlienMatchAllConditions(alien, request.conditions);
  }

  if (request.type === "profession") {
    return alien.profession === request.value;
  }

  if (request.type === "eyeColour") {
    return alien.eyeColour === request.value;
  }

  if (request.type === "heightGreaterThan") {
    return alien.height > request.value;
  }

  if (request.type === "species") {
    return alien.species === request.value;
  }

  if (request.type === "hasTentacles") {
    return alien.hasTentacles === true;
  }

  if (request.type === "numberOfEyes") {
    return alien.numberOfEyes === request.value;
  }

  if (request.type === "nameStartsWith") {
    return alien.name.charAt(0).toUpperCase() === request.value;
  }

  if (request.type === "hazard") {
    return alien.hazard === request.value;
  }

  if (request.type === "purpose") {
    return alien.purpose === request.value;
  }

  return false;
}

function doesAlienMatchAllConditions(alien, conditions) {
  for (var index = 0; index < conditions.length; index = index + 1) {
    var condition = conditions[index];

    if (doesAlienMatchCondition(alien, condition) === false) {
      return false;
    }
  }

  return true;
}

function doesAlienMatchCondition(alien, condition) {
  var alienValue = alien[condition.trait];

  if (condition.comparison === "equals") {
    return alienValue === condition.value;
  }

  if (condition.comparison === "greaterThan") {
    return alienValue > condition.value;
  }

  if (condition.comparison === "startsWith") {
    return String(alienValue).charAt(0).toUpperCase() === condition.value;
  }

  if (condition.comparison === "atLeast" && condition.trait === "hazard") {
    return isHazardAtLeast(alienValue, condition.value);
  }

  return false;
}

function isHazardAtLeast(alienHazard, minimumHazard) {
  var alienHazardIndex = hazards.indexOf(alienHazard);
  var minimumHazardIndex = hazards.indexOf(minimumHazard);

  if (alienHazardIndex === -1 || minimumHazardIndex === -1) {
    return false;
  }

  return alienHazardIndex >= minimumHazardIndex;
}

function getQuotaText(remainingSpaces) {
  if (remainingSpaces <= 0) {
    return "EARTH QUOTA FULL";
  }

  if (remainingSpaces === 1) {
    return "1 space remaining";
  }

  return remainingSpaces + " spaces remaining";
}

/////////////////////////////////////////////////////
//////////       HOST SETUP              ////////////
/////////////////////////////////////////////////////

function createHostPeerWithRoomId(roomId) {
  peer = new Peer(roomId);

  peer.on("open", function(openedPeerId) {
    currentRole = "host";
    hostRoomId.textContent = openedPeerId;
    setConnectionStatus("Hosting room " + openedPeerId);
    showOnlyScreen(hostScreen);
    renderHostPlayerList();
    renderHostSubmissionList();
    startGameButton.disabled = hostGameState.hasStarted;
    copyRoomIdButton.disabled = hostGameState.hasStarted;
    hostMainPageButton.disabled = hostGameState.hasStarted;
    generateRequestButton.disabled = hostGameState.hasStarted === false || hostGameState.gameOver === true;
    hideHostQuota();
  });

  peer.on("connection", function(connection) {
    prepareHostConnection(connection);
  });

  peer.on("error", function(error) {
    console.error(error);

    if (error.type === "unavailable-id") {
      var replacementRoomId = makeRoomId();
      setConnectionStatus("Room ID was busy. Trying " + replacementRoomId + ".");
      createHostPeerWithRoomId(replacementRoomId);
      return;
    }

    setConnectionStatus("PeerJS error: " + error.type);
  });
}

function prepareHostConnection(connection) {
  connection.on("data", function(message) {
    receiveMessageAsHost(connection, message);
  });

  connection.on("close", function() {
    markAgentDisconnected(connection.peer);
  });
}

function receiveMessageAsHost(connection, message) {
  if (message.type === "join-request") {
    addAgentToHostGame(connection, message.agentName);
  }

  if (message.type === "submit-aliens") {
    processAgentSubmission(connection.peer, message.alienIds);
  }
}

function addAgentToHostGame(connection, agentName) {
  if (hostGameState.hasStarted === true) {
    connection.send({
      type: "join-rejected",
      reason: "This game has already started."
    });
    return;
  }

  hostGameState.agents[connection.peer] = {
    peerId: connection.peer,
    name: makeSafePlayerName(agentName),
    connection: connection,
    isConnected: true,
    aliens: [],
    remainingAlienIds: []
  };

  connection.send({
    type: "join-accepted",
    roomId: peer.id,
    agentName: hostGameState.agents[connection.peer].name
  });

  showTemporaryHostStatus(hostGameState.agents[connection.peer].name + " joined the room.");
  startGameButton.disabled = false;
  renderHostPlayerList();
  broadcastProgressToAgents();
}

function markAgentDisconnected(peerId) {
  if (hostGameState.agents[peerId] !== undefined) {
    hostGameState.agents[peerId].isConnected = false;
    renderHostPlayerList();
    broadcastProgressToAgents();
  }
}

function startHostGame() {
  var agentPeerIds = Object.keys(hostGameState.agents);

  if (agentPeerIds.length === 0) {
    showTemporaryHostStatus("At least one agent must join before starting.");
    return;
  }

  hostGameState.hasStarted = true;
  startGameButton.disabled = true;
  copyRoomIdButton.disabled = true;
  hostMainPageButton.disabled = true;
  generateRequestButton.disabled = false;

  for (var index = 0; index < agentPeerIds.length; index = index + 1) {
    var agentRecord = hostGameState.agents[agentPeerIds[index]];
    var aliensForAgent = generateAlienManifest(generationSettings.aliensPerAgent);

    agentRecord.aliens = aliensForAgent;
    agentRecord.remainingAlienIds = aliensForAgent.map(function(alien) {
      return alien.id;
    });

    if (agentRecord.connection !== null && agentRecord.connection.open === true) {
      agentRecord.connection.send({
        type: "game-started",
        aliens: aliensForAgent,
        currentRequest: hostGameState.currentRequest,
        remainingSpaces: hostGameState.remainingSpaces,
        progress: buildPublicProgressList()
      });
    }
  }

  hostRequestText.textContent = "Game started. Generate the first Earth request.";
  hostQuotaText.textContent = "No active quota.";
  showHostQuota();
  showTemporaryHostStatus("Each agent received " + generationSettings.aliensPerAgent + " randomly generated aliens.");
  renderHostPlayerList();
  renderHostSubmissionList();
  broadcastProgressToAgents();
}

function hostGenerateRequest() {
  if (hostGameState.hasStarted === false || hostGameState.gameOver === true) {
    return;
  }

  hostGameState.currentRequest = generateEarthRequest();
  hostGameState.remainingSpaces = hostGameState.currentRequest.spaces;
  hostGameState.currentRequestSubmissions = {};

  hostRequestText.textContent = hostGameState.currentRequest.description;
  flashRequirementText(hostRequestText);
  hostQuotaText.textContent = getQuotaText(hostGameState.remainingSpaces);
  showHostQuota();
  renderHostSubmissionList();
  showTemporaryHostStatus("New Earth request broadcast to all agents.");

  broadcastRequestToAgents();
}

/////////////////////////////////////////////////////
//////////       HOST VALIDATION         ////////////
/////////////////////////////////////////////////////

function processAgentSubmission(agentPeerId, submittedAlienIds) {
  var agentRecord = hostGameState.agents[agentPeerId];

  if (agentRecord === undefined) {
    return;
  }

  var acceptedAlienIds = [];
  var rejectedAlienIds = [];
  var rejectionReasons = [];
  var spacesAtStart = hostGameState.remainingSpaces;
  var agentHadOneAlienBeforeSubmission = agentRecord.remainingAlienIds.length === 1;
  var lastAlienDidNotMatchRequest = false;
  var newAlienPenalty = null;

  if (hostGameState.gameOver === true) {
    sendSubmissionResult(agentRecord, [], submittedAlienIds, "The game is already over.");
    return;
  }

  if (hostGameState.currentRequest === null) {
    sendSubmissionResult(agentRecord, [], submittedAlienIds, "There is no active Earth request.");
    return;
  }

  for (var index = 0; index < submittedAlienIds.length; index = index + 1) {
    var alienId = submittedAlienIds[index];
    var alien = findAlienOwnedByAgent(agentRecord, alienId);
    var alienIsStillAvailable = agentRecord.remainingAlienIds.indexOf(alienId) !== -1;

    if (alien === null || alienIsStillAvailable === false) {
      rejectedAlienIds.push(alienId);
      addReasonIfMissing(rejectionReasons, "Some submitted aliens were not available.");
      continue;
    }

    if (doesAlienMatchRequest(alien, hostGameState.currentRequest) === false) {
      rejectedAlienIds.push(alienId);
      lastAlienDidNotMatchRequest = true;
      addReasonIfMissing(rejectionReasons, "Some aliens did not match the Earth request.");
      continue;
    }

    if (hostGameState.remainingSpaces <= 0) {
      rejectedAlienIds.push(alienId);
      addReasonIfMissing(rejectionReasons, "The Earth quota was already full.");
      continue;
    }

    acceptedAlienIds.push(alienId);
    removeAlienFromAgent(agentRecord, alienId);
    hostGameState.remainingSpaces = hostGameState.remainingSpaces - 1;
  }

  if (acceptedAlienIds.length < submittedAlienIds.length && spacesAtStart > 0 && hostGameState.remainingSpaces === 0) {
    addReasonIfMissing(rejectionReasons, "Only " + spacesAtStart + " spaces remained.");
  }

  if (acceptedAlienIds.length > 0 && rejectionReasons.length === 0) {
    rejectionReasons.push("Accepted.");
  }

  if (acceptedAlienIds.length === 0 && rejectedAlienIds.length === 0) {
    rejectionReasons.push("No aliens were selected.");
  }

  if (shouldAddEndgamePenaltyAlien(agentHadOneAlienBeforeSubmission, submittedAlienIds, acceptedAlienIds, rejectedAlienIds, lastAlienDidNotMatchRequest) === true) {
    newAlienPenalty = addPenaltyAlienToAgent(agentRecord);
    addReasonIfMissing(rejectionReasons, "Endgame penalty: one new alien joined your queue.");
  }

  recordHostSubmission(agentRecord, submittedAlienIds.length, acceptedAlienIds.length);
  sendSubmissionResult(agentRecord, acceptedAlienIds, rejectedAlienIds, rejectionReasons.join(" "), newAlienPenalty);
  updateHostAfterSubmission(agentRecord, acceptedAlienIds.length);
}

function shouldAddEndgamePenaltyAlien(agentHadOneAlienBeforeSubmission, submittedAlienIds, acceptedAlienIds, rejectedAlienIds, lastAlienDidNotMatchRequest) {
  if (agentHadOneAlienBeforeSubmission === false) {
    return false;
  }

  if (submittedAlienIds.length !== 1) {
    return false;
  }

  if (acceptedAlienIds.length > 0) {
    return false;
  }

  if (rejectedAlienIds.length !== 1) {
    return false;
  }

  if (lastAlienDidNotMatchRequest === false) {
    return false;
  }

  return true;
}

function addPenaltyAlienToAgent(agentRecord) {
  var newAlien = generateAlien();

  agentRecord.aliens.push(newAlien);
  agentRecord.remainingAlienIds.push(newAlien.id);

  return newAlien;
}

function getRemainingAliensForAgent(agentRecord) {
  var remainingAliens = [];

  for (var index = 0; index < agentRecord.aliens.length; index = index + 1) {
    var alien = agentRecord.aliens[index];

    if (agentRecord.remainingAlienIds.indexOf(alien.id) !== -1) {
      remainingAliens.push(alien);
    }
  }

  return remainingAliens;
}

function recordHostSubmission(agentRecord, sentCount, acceptedCount) {
  if (hostGameState.currentRequestSubmissions[agentRecord.peerId] === undefined) {
    hostGameState.currentRequestSubmissions[agentRecord.peerId] = {
      name: agentRecord.name,
      sentCount: 0,
      acceptedCount: 0
    };
  }

  hostGameState.currentRequestSubmissions[agentRecord.peerId].sentCount =
    hostGameState.currentRequestSubmissions[agentRecord.peerId].sentCount + sentCount;

  hostGameState.currentRequestSubmissions[agentRecord.peerId].acceptedCount =
    hostGameState.currentRequestSubmissions[agentRecord.peerId].acceptedCount + acceptedCount;
}

function findAlienOwnedByAgent(agentRecord, alienId) {
  for (var index = 0; index < agentRecord.aliens.length; index = index + 1) {
    if (agentRecord.aliens[index].id === alienId) {
      return agentRecord.aliens[index];
    }
  }

  return null;
}

function removeAlienFromAgent(agentRecord, alienId) {
  var updatedRemainingAlienIds = [];

  for (var index = 0; index < agentRecord.remainingAlienIds.length; index = index + 1) {
    if (agentRecord.remainingAlienIds[index] !== alienId) {
      updatedRemainingAlienIds.push(agentRecord.remainingAlienIds[index]);
    }
  }

  agentRecord.remainingAlienIds = updatedRemainingAlienIds;
}

function addReasonIfMissing(reasons, newReason) {
  if (reasons.indexOf(newReason) === -1) {
    reasons.push(newReason);
  }
}

function sendSubmissionResult(agentRecord, acceptedAlienIds, rejectedAlienIds, reason, newAlien) {
  agentRecord.connection.send({
    type: "submission-result",
    acceptedAlienIds: acceptedAlienIds,
    rejectedAlienIds: rejectedAlienIds,
    newAlien: newAlien,
    remainingSpaces: hostGameState.remainingSpaces,
    progress: buildPublicProgressList(),
    reason: reason
  });
}

function updateHostAfterSubmission(agentRecord, acceptedCount) {
  hostQuotaText.textContent = getQuotaText(hostGameState.remainingSpaces);

  if (acceptedCount === 1) {
    showTemporaryHostStatus(agentRecord.name + " cleared 1 alien.");
  }

  if (acceptedCount !== 1) {
    showTemporaryHostStatus(agentRecord.name + " cleared " + acceptedCount + " aliens.");
  }

  renderHostPlayerList();
  renderHostSubmissionList();
  broadcastQuotaAndProgressToAgents();

  if (agentRecord.remainingAlienIds.length === 0) {
    declareWinner(agentRecord.name);
  }
}

function declareWinner(winnerName) {
  hostGameState.gameOver = true;
  generateRequestButton.disabled = true;
  startGameButton.disabled = true;

  var winningMessage = "AGENT " + winnerName.toUpperCase() + " HAS CLEARED CUSTOMS!";
  gameOverMessage.textContent = winningMessage;
  setConnectionStatus("Game over");
  showOnlyScreen(gameOverScreen);

  broadcastToAgents({
    type: "game-over",
    message: winningMessage,
    progress: buildPublicProgressList()
  });
}

function resetGameAsHost() {
  var hostConfirmedReset = window.confirm("Reset this game for everyone?");

  if (hostConfirmedReset === false) {
    return;
  }

  broadcastToAgents({
    type: "host-reset",
    message: "The host reset the game."
  });

  window.setTimeout(function() {
    finishHostReset();
  }, 150);
}

function finishHostReset() {
  if (peer !== null) {
    peer.destroy();
  }

  peer = null;
  hostConnection = null;
  currentRole = "";
  currentAgentName = "";
  localAgentAliens = [];
  selectedAlienIds = [];
  hostGameState = makeEmptyHostGameState();

  hostRoomId.textContent = "----";
  hostRequestText.textContent = "Waiting to start.";
  hostQuotaText.textContent = "No active Earth request.";
  hideHostQuota();
  hostStatusMessage.textContent = "Share the room ID with agents.";
  copyRoomIdButton.disabled = false;
  hostMainPageButton.disabled = false;
  hostPlayerList.innerHTML = "";
  renderHostPlayerList();
  renderHostSubmissionList();
  resetWelcomeScreen();
  setConnectionStatus("Not connected");
  showOnlyScreen(welcomeScreen);
}

function resetAgentAfterHostReset(message) {
  if (peer !== null) {
    peer.destroy();
  }

  peer = null;
  hostConnection = null;
  currentRole = "";
  currentAgentName = "";
  localAgentAliens = [];
  selectedAlienIds = [];

  agentRequestText.textContent = "Waiting for the host to start.";
  agentQuotaText.textContent = "No active quota.";
  agentSubmissionStatus.textContent = message;
  hideAgentRoundDetails();
  agentPlayerList.innerHTML = "";
  alienTableBody.innerHTML = "";
  updateAgentRemainingBadge();
  updateSelectedCount();
  resetWelcomeScreen();
  setConnectionStatus(message);
  showOnlyScreen(welcomeScreen);
}

/////////////////////////////////////////////////////
//////////       HOST BROADCASTS         ////////////
/////////////////////////////////////////////////////

function buildPublicProgressList() {
  var progressList = [];
  var agentPeerIds = Object.keys(hostGameState.agents);

  for (var index = 0; index < agentPeerIds.length; index = index + 1) {
    var agentRecord = hostGameState.agents[agentPeerIds[index]];

    progressList.push({
      name: agentRecord.name,
      remainingAliens: agentRecord.remainingAlienIds.length,
      isConnected: agentRecord.isConnected
    });
  }

  return progressList;
}

function broadcastToAgents(message) {
  var agentPeerIds = Object.keys(hostGameState.agents);

  for (var index = 0; index < agentPeerIds.length; index = index + 1) {
    var agentRecord = hostGameState.agents[agentPeerIds[index]];

    if (agentRecord.isConnected === true && agentRecord.connection !== null && agentRecord.connection.open === true) {
      agentRecord.connection.send(message);
    }
  }
}

function broadcastRequestToAgents() {
  broadcastToAgents({
    type: "earth-request",
    request: hostGameState.currentRequest,
    remainingSpaces: hostGameState.remainingSpaces,
    progress: buildPublicProgressList()
  });
}

function broadcastProgressToAgents() {
  broadcastToAgents({
    type: "progress-update",
    progress: buildPublicProgressList()
  });
}

function broadcastQuotaAndProgressToAgents() {
  broadcastToAgents({
    type: "quota-update",
    remainingSpaces: hostGameState.remainingSpaces,
    progress: buildPublicProgressList()
  });
}

/////////////////////////////////////////////////////
//////////       AGENT SETUP             ////////////
/////////////////////////////////////////////////////

function joinHostRoom(agentName, hostId) {
  currentRole = "agent";
  currentAgentName = makeSafePlayerName(agentName);
  peer = new Peer();

  peer.on("open", function() {
    hostConnection = peer.connect(hostId);
    prepareAgentConnection();
  });

  peer.on("error", function(error) {
    console.error(error);
    setConnectionStatus("PeerJS error: " + error.type);
  });
}

function prepareAgentConnection() {
  hostConnection.on("open", function() {
    setConnectionStatus("Connected to host");
    hostConnection.send({
      type: "join-request",
      agentName: currentAgentName
    });
  });

  hostConnection.on("data", function(message) {
    receiveMessageAsAgent(message);
  });

  hostConnection.on("close", function() {
    setConnectionStatus("Disconnected from host");
    sendSelectedButton.disabled = true;
  });

  hostConnection.on("error", function(error) {
    console.error(error);
    setConnectionStatus("Connection error");
  });
}

function receiveMessageAsAgent(message) {
  if (message.type === "join-accepted") {
    currentAgentName = message.agentName;
    agentRequestText.textContent = "Waiting for the host to start.";
    agentQuotaText.textContent = "No active quota.";
    agentSubmissionStatus.textContent = "No submission yet.";
    hideAgentRoundDetails();
    localAgentAliens = [];
    selectedAlienIds = [];
    renderAlienTableSkeleton(10);
    updateAgentRemainingBadge();
    updateSelectedCount();
    setConnectionStatus("Joined room " + message.roomId);
    showOnlyScreen(agentScreen);
  }

  if (message.type === "join-rejected") {
    setConnectionStatus(message.reason);
  }

  if (message.type === "game-started") {
    localAgentAliens = message.aliens;
    selectedAlienIds = [];
    agentRequestText.textContent = "Waiting for Earth's first request.";
    agentQuotaText.textContent = "No active quota.";
    agentSubmissionStatus.textContent = "No submission yet.";
    hideAgentRoundDetails();
    renderAlienTable();
    renderAgentProgress(message.progress);
    updateAgentRemainingBadge();
    updateSelectedCount();
  }

  if (message.type === "earth-request") {
    agentRequestText.textContent = message.request.description;
    flashRequirementText(agentRequestText);
    agentQuotaText.textContent = getQuotaText(message.remainingSpaces);
    agentSubmissionStatus.textContent = "Select matching aliens and send them to customs.";
    showAgentRoundDetails();
    renderAgentProgress(message.progress);
    updateSendButtonState(message.remainingSpaces);
  }

  if (message.type === "submission-result") {
    removeAcceptedAliensFromLocalManifest(message.acceptedAlienIds);
    addNewAlienFromSubmissionResult(message.newAlien);
    selectedAlienIds = [];
    agentQuotaText.textContent = getQuotaText(message.remainingSpaces);
    agentSubmissionStatus.textContent = buildSubmissionStatusText(message);
    showAgentRoundDetails();
    renderAlienTable();
    renderAgentProgress(message.progress);
    updateAgentRemainingBadge();
    updateSelectedCount();
    updateSendButtonState(message.remainingSpaces);
  }

  if (message.type === "quota-update") {
    agentQuotaText.textContent = getQuotaText(message.remainingSpaces);
    showAgentRoundDetails();
    renderAgentProgress(message.progress);
    updateSendButtonState(message.remainingSpaces);
  }

  if (message.type === "progress-update") {
    renderAgentProgress(message.progress);
  }

  if (message.type === "game-over") {
    gameOverMessage.textContent = message.message;
    renderAgentProgress(message.progress);
    sendSelectedButton.disabled = true;
    setConnectionStatus("Game over");
    showOnlyScreen(gameOverScreen);
  }

  if (message.type === "host-reset") {
    resetAgentAfterHostReset(message.message);
  }
}

function buildSubmissionStatusText(message) {
  var acceptedCount = message.acceptedAlienIds.length;
  var rejectedCount = message.rejectedAlienIds.length;
  var acceptedWord = "aliens";
  var rejectedWord = "aliens";

  if (acceptedCount === 1) {
    acceptedWord = "alien";
  }

  if (rejectedCount === 1) {
    rejectedWord = "alien";
  }

  return acceptedCount + " " + acceptedWord + " accepted, " + rejectedCount + " " + rejectedWord + " rejected. " + message.reason;
}

function removeAcceptedAliensFromLocalManifest(acceptedAlienIds) {
  var updatedAliens = [];

  for (var index = 0; index < localAgentAliens.length; index = index + 1) {
    var alien = localAgentAliens[index];

    if (acceptedAlienIds.indexOf(alien.id) === -1) {
      updatedAliens.push(alien);
    }
  }

  localAgentAliens = updatedAliens;
}

function addNewAlienFromSubmissionResult(newAlien) {
  if (newAlien === undefined || newAlien === null) {
    return;
  }

  localAgentAliens.push(newAlien);
}

/////////////////////////////////////////////////////
//////////       RENDERING              /////////////
/////////////////////////////////////////////////////

function renderHostPlayerList() {
  hostPlayerList.innerHTML = "";
  hostPlayerList.classList.remove("compact-player-list");

  var agentPeerIds = Object.keys(hostGameState.agents);

  if (agentPeerIds.length === 0) {
    hostPlayerList.innerHTML = '<p class="status-line">No agents connected yet.</p>';
    return;
  }

  if (agentPeerIds.length > 8) {
    hostPlayerList.classList.add("compact-player-list");
  }

  for (var index = 0; index < agentPeerIds.length; index = index + 1) {
    var agentRecord = hostGameState.agents[agentPeerIds[index]];
    var playerRow = document.createElement("div");
    var nameElement = document.createElement("strong");
    var detailElement = document.createElement("span");

    playerRow.className = "player-row";
    nameElement.textContent = agentRecord.name;

    if (hostGameState.hasStarted === true) {
      detailElement.textContent = agentRecord.remainingAlienIds.length + " left";
    } else {
      detailElement.textContent = agentRecord.isConnected ? "ready" : "offline";
    }

    playerRow.appendChild(nameElement);
    playerRow.appendChild(detailElement);
    hostPlayerList.appendChild(playerRow);
  }
}

function renderHostSubmissionList() {
  hostSubmissionList.innerHTML = "";

  var submitterPeerIds = Object.keys(hostGameState.currentRequestSubmissions);

  if (submitterPeerIds.length === 0) {
    hostSubmissionList.innerHTML = '<p class="status-line">No submissions for this request yet.</p>';
    return;
  }

  for (var index = 0; index < submitterPeerIds.length; index = index + 1) {
    var submissionRecord = hostGameState.currentRequestSubmissions[submitterPeerIds[index]];
    var submissionRow = document.createElement("div");
    var nameElement = document.createElement("strong");
    var detailElement = document.createElement("span");

    submissionRow.className = "submission-row";
    nameElement.textContent = submissionRecord.name;
    detailElement.textContent = buildSubmissionSummaryText(submissionRecord);

    submissionRow.appendChild(nameElement);
    submissionRow.appendChild(detailElement);
    hostSubmissionList.appendChild(submissionRow);
  }
}

function buildSubmissionSummaryText(submissionRecord) {
  if (submissionRecord.sentCount === submissionRecord.acceptedCount) {
    return submissionRecord.acceptedCount + " accepted";
  }

  return submissionRecord.acceptedCount + " accepted from " + submissionRecord.sentCount + " sent";
}

function renderAgentProgress(progressList) {
  agentPlayerList.innerHTML = "";
  agentPlayerList.classList.remove("compact-player-list");

  if (progressList === undefined || progressList.length === 0) {
    agentPlayerList.innerHTML = '<p class="status-line">Waiting for agents.</p>';
    return;
  }

  if (progressList.length > 8) {
    agentPlayerList.classList.add("compact-player-list");
  }

  for (var index = 0; index < progressList.length; index = index + 1) {
    var player = progressList[index];
    var playerRow = document.createElement("div");
    var nameElement = document.createElement("strong");
    var detailElement = document.createElement("span");

    playerRow.className = "player-row";
    nameElement.textContent = player.name;
    detailElement.textContent = player.remainingAliens + " left";

    if (player.isConnected === false) {
      detailElement.textContent = detailElement.textContent + " - offline";
    }

    playerRow.appendChild(nameElement);
    playerRow.appendChild(detailElement);
    agentPlayerList.appendChild(playerRow);
  }
}

function renderAlienTable() {
  alienTableBody.innerHTML = "";

  for (var index = 0; index < localAgentAliens.length; index = index + 1) {
    var alien = localAgentAliens[index];
    var row = document.createElement("tr");

    row.dataset.alienId = alien.id;
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", "Select " + alien.name);
    row.setAttribute("aria-pressed", "false");

    if (selectedAlienIds.indexOf(alien.id) !== -1) {
      row.classList.add("selected-row");
      row.setAttribute("aria-pressed", "true");
    }

    row.appendChild(makeTextCell(alien.name));
    row.appendChild(makeTextCell(alien.species));
    row.appendChild(makeTextCell(alien.numberOfEyes));
    row.appendChild(makeTextCell(alien.eyeColour));
    row.appendChild(makeTextCell(alien.hasTentacles ? "Yes" : "No"));
    row.appendChild(makeTextCell(alien.height.toFixed(2) + "m"));
    row.appendChild(makeTextCell(alien.profession));
    row.appendChild(makeTextCell(alien.hazard));
    row.appendChild(makeTextCell(alien.purpose));

    row.addEventListener("click", function(event) {
      var clickedElement = event.target;
      var clickedRow = clickedElement.closest("tr");

      if (clickedRow !== null) {
        toggleAlienSelection(clickedRow.dataset.alienId);
      }
    });

    row.addEventListener("keydown", function(event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleAlienSelection(event.currentTarget.dataset.alienId);
      }
    });

    alienTableBody.appendChild(row);
  }
}

function renderAlienTableSkeleton(rowCount) {
  alienTableBody.innerHTML = "";

  for (var rowIndex = 0; rowIndex < rowCount; rowIndex = rowIndex + 1) {
    var row = document.createElement("tr");

    row.className = "skeleton-row";
    row.setAttribute("aria-hidden", "true");

    for (var cellIndex = 0; cellIndex < 9; cellIndex = cellIndex + 1) {
      var cell = document.createElement("td");
      var skeletonBar = document.createElement("span");

      skeletonBar.className = "skeleton-bar skeleton-bar-" + ((cellIndex % 3) + 1);
      cell.appendChild(skeletonBar);
      row.appendChild(cell);
    }

    alienTableBody.appendChild(row);
  }
}

function makeTextCell(text) {
  var cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function toggleAlienSelection(alienId) {
  var selectedIndex = selectedAlienIds.indexOf(alienId);

  if (selectedIndex === -1) {
    selectedAlienIds.push(alienId);
  } else {
    selectedAlienIds.splice(selectedIndex, 1);
  }

  playAlienSelectSound();
  renderAlienTable();
  updateSelectedCount();
}

function updateSelectedCount() {
  if (selectedAlienIds.length === 1) {
    selectedCountText.textContent = "1 selected";
  } else {
    selectedCountText.textContent = selectedAlienIds.length + " selected";
  }
}

function updateAgentRemainingBadge() {
  var remainingCount = localAgentAliens.length;

  if (remainingCount === 1) {
    agentRemainingBadge.textContent = "1 alien remaining";
  } else {
    agentRemainingBadge.textContent = remainingCount + " aliens remaining";
  }
}

function updateSendButtonState(remainingSpaces) {
  if (remainingSpaces <= 0) {
    sendSelectedButton.disabled = true;
    return;
  }

  sendSelectedButton.disabled = false;
}

/////////////////////////////////////////////////////
//////////       BUTTON EVENTS           ////////////
/////////////////////////////////////////////////////

document.addEventListener("click", function(event) {
  var clickedButton = event.target.closest("button");

  if (clickedButton === null) {
    return;
  }

  if (clickedButton.disabled === true) {
    return;
  }

  playButtonClickSound();
});

createGameButton.addEventListener("click", function() {
  if (isAlienDataReady() === false) {
    return;
  }

  if (typeof Peer === "undefined") {
    setConnectionStatus("PeerJS did not load. Check your internet connection.");
    return;
  }

  createHostPeerWithRoomId(makeRoomId());
});

showJoinFormButton.addEventListener("click", function() {
  createGameButton.classList.add("hidden");
  showJoinFormButton.classList.add("hidden");
  joinForm.classList.remove("hidden");
  agentNameInput.focus();
});

backToWelcomeFromJoinButton.addEventListener("click", function() {
  resetWelcomeScreen();
  setConnectionStatus("Not connected");
});

joinForm.addEventListener("submit", function(event) {
  event.preventDefault();

  if (isAlienDataReady() === false) {
    return;
  }

  if (typeof Peer === "undefined") {
    setConnectionStatus("PeerJS did not load. Check your internet connection.");
    return;
  }

  var agentName = makeSafePlayerName(agentNameInput.value);
  var hostId = hostIdInput.value.trim().toUpperCase();

  if (hostId.length === 0) {
    setConnectionStatus("Enter the Host ID first.");
    return;
  }

  setConnectionStatus("Connecting to " + hostId + "...");
  joinHostRoom(agentName, hostId);
});

copyRoomIdButton.addEventListener("click", function() {
  var roomId = hostRoomId.textContent;

  if (navigator.clipboard !== undefined) {
    navigator.clipboard.writeText(roomId);
    showTemporaryHostStatus("Room ID copied.");
  } else {
    showTemporaryHostStatus("Room ID: " + roomId);
  }
});

hostMainPageButton.addEventListener("click", function() {
  returnToMainPage();
});

startGameButton.addEventListener("click", function() {
  startHostGame();
});

generateRequestButton.addEventListener("click", function() {
  hostGenerateRequest();
});

resetGameButton.addEventListener("click", function() {
  resetGameAsHost();
});

gameOverMainPageButton.addEventListener("click", function() {
  returnToMainPage();
});

sendSelectedButton.addEventListener("click", function() {
  if (hostConnection === null || hostConnection.open === false) {
    agentSubmissionStatus.textContent = "Not connected to the host.";
    return;
  }

  if (selectedAlienIds.length === 0) {
    agentSubmissionStatus.textContent = "Select at least one alien first.";
    return;
  }

  hostConnection.send({
    type: "submit-aliens",
    alienIds: selectedAlienIds.slice()
  });

  agentSubmissionStatus.textContent = "Submission sent to the host.";
});

/////////////////////////////////////////////////////
//////////       PREVIEW / DEBUG TOOLS    ///////////
/////////////////////////////////////////////////////

function makePreviewProgressList(numberOfOtherAgents) {
  var progressList = [];
  var totalAgents = numberOfOtherAgents + 1;

  for (var agentNumber = 1; agentNumber <= totalAgents; agentNumber = agentNumber + 1) {
    var remainingAliens = getRandomInteger(3, generationSettings.aliensPerAgent);

    if (agentNumber === 1) {
      progressList.push({
        name: "You",
        remainingAliens: 14,
        isConnected: true
      });
    } else {
      progressList.push({
        name: "Agent " + agentNumber,
        remainingAliens: remainingAliens,
        isConnected: true
      });
    }
  }

  return progressList;
}

function showAgentPreview(numberOfOtherAgents) {
  if (isAlienDataReady() === false) {
    return;
  }

  if (numberOfOtherAgents === undefined) {
    numberOfOtherAgents = 19;
  }

  localAgentAliens = generateAlienManifest(generationSettings.aliensPerAgent);
  selectedAlienIds = [];
  var previewRequest = generateEarthRequest();

  agentRequestText.textContent = previewRequest.description;
  agentQuotaText.textContent = getQuotaText(previewRequest.spaces);
  agentSubmissionStatus.textContent = "Preview mode: rows are clickable, but no host is connected.";
  showAgentRoundDetails();
  sendSelectedButton.disabled = true;

  renderAlienTable();
  renderAgentProgress(makePreviewProgressList(numberOfOtherAgents));
  updateAgentRemainingBadge();
  updateSelectedCount();
  flashRequirementText(agentRequestText);

  setConnectionStatus("Agent preview with " + numberOfOtherAgents + " other agents");
  showOnlyScreen(agentScreen);
}

function showHostPreview(numberOfConnectedAgents) {
  if (isAlienDataReady() === false) {
    return;
  }

  if (numberOfConnectedAgents === undefined) {
    numberOfConnectedAgents = 19;
  }

  hostGameState.hasStarted = true;
  hostGameState.gameOver = false;
  hostGameState.currentRequest = {
    description: "Earth is accepting 8 aliens taller than 1.5 metres."
  };
  hostGameState.remainingSpaces = 8;
  hostGameState.agents = {};
  hostGameState.currentRequestSubmissions = {};

  for (var agentNumber = 1; agentNumber <= numberOfConnectedAgents; agentNumber = agentNumber + 1) {
    var previewPeerId = "preview-agent-" + agentNumber;
    var remainingAlienIds = [];
    var numberOfAliensLeft = getRandomInteger(3, generationSettings.aliensPerAgent);

    for (var alienNumber = 1; alienNumber <= numberOfAliensLeft; alienNumber = alienNumber + 1) {
      remainingAlienIds.push("preview-alien-" + agentNumber + "-" + alienNumber);
    }

    hostGameState.agents[previewPeerId] = {
      peerId: previewPeerId,
      name: "Agent " + agentNumber,
      connection: null,
      isConnected: true,
      aliens: [],
      remainingAlienIds: remainingAlienIds
    };
  }

  hostGameState.currentRequestSubmissions["preview-agent-1"] = {
    name: "Agent 1",
    sentCount: 2,
    acceptedCount: 2
  };
  hostGameState.currentRequestSubmissions["preview-agent-2"] = {
    name: "Agent 2",
    sentCount: 2,
    acceptedCount: 1
  };
  hostGameState.currentRequestSubmissions["preview-agent-3"] = {
    name: "Agent 3",
    sentCount: 2,
    acceptedCount: 2
  };

  hostRoomId.textContent = "AC-DEMO";
  hostRequestText.textContent = hostGameState.currentRequest.description;
  hostQuotaText.textContent = getQuotaText(hostGameState.remainingSpaces);
  showHostQuota();
  hostStatusMessage.textContent = "Preview mode: these are sample agents.";
  startGameButton.disabled = true;
  copyRoomIdButton.disabled = true;
  hostMainPageButton.disabled = true;
  generateRequestButton.disabled = true;

  renderHostPlayerList();
  renderHostSubmissionList();
  flashRequirementText(hostRequestText);

  setConnectionStatus("Host preview with " + numberOfConnectedAgents + " agents");
  showOnlyScreen(hostScreen);
}

window.alienCustomsDebug = {
  showAgentPreview: showAgentPreview,
  showHostPreview: showHostPreview
};

loadAlienDataFromJson();
