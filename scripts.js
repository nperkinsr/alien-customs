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
var howToPlayButton = document.getElementById("howToPlayButton");
var joinForm = document.getElementById("joinForm");
var agentNameInput = document.getElementById("agentNameInput");
var hostIdInput = document.getElementById("hostIdInput");
var connectionStatus = document.getElementById("connectionStatus");
var howToPlayModal = document.getElementById("howToPlayModal");
var closeHowToPlayButton = document.getElementById("closeHowToPlayButton");

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
var gameOverStandings = document.getElementById("gameOverStandings");
var requestCountdownOverlay = document.getElementById("requestCountdownOverlay");
var requestCountdownNumber = document.getElementById("requestCountdownNumber");

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
  singleRequestMinimumPercent: 5,
  singleRequestMaximumPercent: 9,
  singleRequestMinimumSpaces: 3,
  singleRequestMaximumSpaces: 20,
  compoundRequestMinimumPercent: 3,
  compoundRequestMaximumPercent: 5,
  compoundRequestMinimumSpaces: 2,
  compoundRequestMaximumSpaces: 8,
  heightRequestThresholds: [1.2, 1.5, 1.8, 2.0, 2.2]
};
var alienDataLoaded = false;

var peer = null;
var hostConnection = null;
var currentRole = "";
var currentAgentName = "";
var localAgentAliens = [];
var selectedAlienIds = [];
var requestCountdownTimer = null;
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

function showRequestCountdown(count) {
  requestCountdownNumber.textContent = count;
  requestCountdownOverlay.hidden = false;
}

function hideRequestCountdown() {
  requestCountdownOverlay.hidden = true;
}

function clearRequestCountdownTimer() {
  if (requestCountdownTimer !== null) {
    window.clearTimeout(requestCountdownTimer);
    requestCountdownTimer = null;
  }
}

function clearGameOverStandings() {
  gameOverStandings.innerHTML = "";
}

function openHowToPlayModal() {
  howToPlayModal.hidden = false;
  closeHowToPlayButton.focus();
}

function closeHowToPlayModal() {
  howToPlayModal.hidden = true;
  howToPlayButton.focus();
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
  clearRequestCountdownTimer();
  hideRequestCountdown();
  clearGameOverStandings();
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

function getRandomBoolean() {
  return Math.random() >= 0.5;
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

function makeTextPart(text) {
  return {
    text: String(text),
    highlight: false
  };
}

function makeHighlightPart(text) {
  return {
    text: String(text),
    highlight: true
  };
}

function setRequestDescription(request, parts) {
  request.descriptionParts = parts;
  request.description = parts.map(function(part) {
    return part.text;
  }).join("");
}

function renderRequestText(requestElement, request) {
  if (request.descriptionParts === undefined) {
    requestElement.textContent = request.description;
    return;
  }

  requestElement.innerHTML = "";

  for (var index = 0; index < request.descriptionParts.length; index = index + 1) {
    var part = request.descriptionParts[index];
    var span = document.createElement("span");

    span.textContent = part.text;

    if (part.highlight === true) {
      span.className = "request-highlight";
    }

    requestElement.appendChild(span);
  }
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

function generateEarthRequest(totalAliensRemaining) {
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
  var spacesAvailable = calculateEarthRequestSpaces(totalAliensRemaining, isCompoundRequestType(requestType));

  if (requestType === "nameStartsWith") {
    spacesAvailable = reduceNameInitialRequestSpaces(spacesAvailable);
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
    if (getRandomBoolean() === true) {
      setRequestDescription(request, [
        makeTextPart("Send "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" aliens registered as "),
        makeHighlightPart(request.value),
        makeTextPart(" for a job fair.")
      ]);
    } else {
      setRequestDescription(request, [
        makeTextPart("Earth is celebrating "),
        makeHighlightPart(request.value),
        makeTextPart(" Appreciation Day. Send "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" aliens.")
      ]);
    }
    request.conditions.push({
      trait: "profession",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "eyeColour") {
    request.value = getRandomItem(eyeColours);
    var requestedEyeColourText = request.value.toLowerCase() + " eyes";

    if (getRandomBoolean() === true) {
      setRequestDescription(request, [
        makeTextPart("Send "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" aliens with "),
        makeHighlightPart(requestedEyeColourText),
        makeTextPart(" for biometric testing.")
      ]);
    } else {
      setRequestDescription(request, [
        makeTextPart("A film studio on Earth requests "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" aliens with "),
        makeHighlightPart(requestedEyeColourText),
        makeTextPart(".")
      ]);
    }
    request.conditions.push({
      trait: "eyeColour",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "heightGreaterThan") {
    request.value = getRandomItem(generationSettings.heightRequestThresholds);
    var isTallerThanRequest = getRandomBoolean();

    if (isTallerThanRequest === true) {
      if (getRandomBoolean() === true) {
        setRequestDescription(request, [
          makeTextPart("Earth's basketball team needs "),
          makeHighlightPart(spacesAvailable),
          makeTextPart(" aliens taller than "),
          makeHighlightPart(request.value + " metres"),
          makeTextPart(".")
        ]);
      } else {
        setRequestDescription(request, [
          makeTextPart("Earth needs "),
          makeHighlightPart(spacesAvailable),
          makeTextPart(" aliens over "),
          makeHighlightPart(request.value + " metres"),
          makeTextPart(" to retrieve a stranded cat.")
        ]);
      }
    } else {
      if (getRandomBoolean() === true) {
        setRequestDescription(request, [
          makeTextPart("The ceilings are unusually low. Send "),
          makeHighlightPart(spacesAvailable),
          makeTextPart(" aliens shorter than "),
          makeHighlightPart(request.value + " metres"),
          makeTextPart(".")
        ]);
      } else {
        setRequestDescription(request, [
          makeTextPart("The crawl-space inspection requires "),
          makeHighlightPart(spacesAvailable),
          makeTextPart(" aliens under "),
          makeHighlightPart(request.value + " metres"),
          makeTextPart(".")
        ]);
      }
    }
    request.conditions.push({
      trait: "height",
      comparison: isTallerThanRequest ? "greaterThan" : "lessThan",
      value: request.value
    });
  }

  if (requestType === "species") {
    request.value = getRandomItem(alienSpecies);
    if (getRandomBoolean() === true) {
      setRequestDescription(request, [
        makeTextPart("The officer who is frightened of the "),
        makeHighlightPart(request.value),
        makeTextPart(" has gone to lunch. Quickly send "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" aliens.")
      ]);
    } else {
      setRequestDescription(request, [
        makeTextPart("The quarantine restrictions affecting the "),
        makeHighlightPart(request.value),
        makeTextPart(" have been lifted. Send "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" aliens.")
      ]);
    }
    request.conditions.push({
      trait: "species",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "hasTentacles") {
    request.value = getRandomBoolean();

    if (request.value === true) {
      if (getRandomBoolean() === true) {
        setRequestDescription(request, [
          makeTextPart("Earth needs help untangling cables. Send "),
          makeHighlightPart(spacesAvailable),
          makeTextPart(" aliens "),
          makeHighlightPart("with tentacles"),
          makeTextPart(".")
        ]);
      } else {
        setRequestDescription(request, [
          makeTextPart("A jar-opening emergency requires "),
          makeHighlightPart(spacesAvailable + " tentacled"),
          makeTextPart(" aliens.")
        ]);
      }
    } else {
      if (getRandomBoolean() === true) {
        setRequestDescription(request, [
          makeTextPart("Customs has declared a "),
          makeHighlightPart("tentacle-free"),
          makeTextPart(" day. Send "),
          makeHighlightPart(spacesAvailable),
          makeTextPart(" aliens.")
        ]);
      } else {
        setRequestDescription(request, [
          makeTextPart("Earth's new uniforms have "),
          makeHighlightPart("no tentacle"),
          makeTextPart(" holes. Send "),
          makeHighlightPart(spacesAvailable),
          makeTextPart(" suitable aliens.")
        ]);
      }
    }

    request.conditions.push({
      trait: "hasTentacles",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "numberOfEyes") {
    request.value = getRandomEyeCountForRequest();
    if (getRandomBoolean() === true) {
      setRequestDescription(request, [
        makeTextPart("Our eye-counting machine is calibrated to "),
        makeHighlightPart(request.value),
        makeTextPart(". Send "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" compatible aliens.")
      ]);
    } else {
      setRequestDescription(request, [
        makeTextPart("The Department of Vision requires "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" visitors whose eye count is exactly "),
        makeHighlightPart(request.value),
        makeTextPart(".")
      ]);
    }
    request.conditions.push({
      trait: "numberOfEyes",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "nameStartsWith") {
    request.value = getRandomAlienNameFirstLetterForRequest();
    spacesAvailable = Math.min(spacesAvailable, countRemainingAliensWithNameInitial(request.value));
    request.spaces = spacesAvailable;
    if (getRandomBoolean() === true) {
      setRequestDescription(request, [
        makeTextPart("Terminal "),
        makeHighlightPart(request.value),
        makeTextPart(" is unusually empty. Send "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" aliens whose names begin with "),
        makeHighlightPart(request.value),
        makeTextPart(".")
      ]);
    } else {
      setRequestDescription(request, [
        makeTextPart("Earth requires "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" more aliens for the "),
        makeHighlightPart(request.value),
        makeTextPart(" section of the telephone directory.")
      ]);
    }
    request.conditions.push({
      trait: "name",
      comparison: "startsWith",
      value: request.value
    });
  }

  if (requestType === "hazard") {
    request.value = getRandomItem(hazards);
    if (getRandomBoolean() === true) {
      setRequestDescription(request, [
        makeTextPart("Earth has approved entry for "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" aliens classified as "),
        makeHighlightPart(request.value),
        makeTextPart(".")
      ]);
    } else {
      setRequestDescription(request, [
        makeTextPart("The hazard scanner is set to "),
        makeHighlightPart(request.value),
        makeTextPart(". Send "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" aliens.")
      ]);
    }
    request.conditions.push({
      trait: "hazard",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "purpose") {
    request.value = getRandomItem(purposes);
    if (getRandomBoolean() === true) {
      setRequestDescription(request, [
        makeTextPart("The '"),
        makeHighlightPart(request.value),
        makeTextPart("' arrivals desk is open. Send "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" aliens.")
      ]);
    } else {
      setRequestDescription(request, [
        makeTextPart("The visa printer is producing only '"),
        makeHighlightPart(request.value),
        makeTextPart("' permits. Send "),
        makeHighlightPart(spacesAvailable),
        makeTextPart(" aliens.")
      ]);
    }
    request.conditions.push({
      trait: "purpose",
      comparison: "equals",
      value: request.value
    });
  }

  if (requestType === "dangerousMilitaryProgramme") {
    request.value = "Dangerous";
    setRequestDescription(request, [
      makeTextPart("Earth urgently requires "),
      makeHighlightPart(spacesAvailable + " Dangerous"),
      makeTextPart(" aliens for its military programme.")
    ]);
    request.conditions.push({
      trait: "hazard",
      comparison: "equals",
      value: "Dangerous"
    });
  }

  if (requestType === "eyeColourAndHeight") {
    var requestedEyeColour = getRandomItem(eyeColours);
    var requestedHeight = getRandomItem(generationSettings.heightRequestThresholds);
    var compoundIsTallerThan = getRandomBoolean();
    var requestedEyeColourLower = requestedEyeColour.toLowerCase();

    request.value = requestedEyeColour;
    if (compoundIsTallerThan === true) {
      if (getRandomBoolean() === true) {
        setRequestDescription(request, [
          makeTextPart("Biometric testing needs "),
          makeHighlightPart(spacesAvailable + " " + requestedEyeColourLower + "-eyed"),
          makeTextPart(" aliens taller than "),
          makeHighlightPart(requestedHeight + " metres"),
          makeTextPart(".")
        ]);
      } else {
        setRequestDescription(request, [
          makeTextPart("The new scanners need "),
          makeHighlightPart(spacesAvailable),
          makeTextPart(" aliens with "),
          makeHighlightPart(requestedEyeColourLower + " eyes"),
          makeTextPart(" over "),
          makeHighlightPart(requestedHeight + " metres"),
          makeTextPart(".")
        ]);
      }
    } else {
      if (getRandomBoolean() === true) {
        setRequestDescription(request, [
          makeTextPart("The compact scanners need "),
          makeHighlightPart(spacesAvailable),
          makeTextPart(" aliens with "),
          makeHighlightPart(requestedEyeColourLower + " eyes"),
          makeTextPart(" under "),
          makeHighlightPart(requestedHeight + " metres"),
          makeTextPart(".")
        ]);
      } else {
        setRequestDescription(request, [
          makeTextPart("The tunnel team needs "),
          makeHighlightPart(spacesAvailable + " " + requestedEyeColourLower + "-eyed"),
          makeTextPart(" aliens shorter than "),
          makeHighlightPart(requestedHeight + " metres"),
          makeTextPart(".")
        ]);
      }
    }
    request.conditions.push({
      trait: "eyeColour",
      comparison: "equals",
      value: requestedEyeColour
    });
    request.conditions.push({
      trait: "height",
      comparison: compoundIsTallerThan ? "greaterThan" : "lessThan",
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

function calculateEarthRequestSpaces(totalAliensRemaining, isCompoundRequest) {
  var minimumPercent = generationSettings.singleRequestMinimumPercent;
  var maximumPercent = generationSettings.singleRequestMaximumPercent;
  var minimumSpaces = generationSettings.singleRequestMinimumSpaces;
  var maximumSpaces = generationSettings.singleRequestMaximumSpaces;

  if (isCompoundRequest === true) {
    minimumPercent = generationSettings.compoundRequestMinimumPercent;
    maximumPercent = generationSettings.compoundRequestMaximumPercent;
    minimumSpaces = generationSettings.compoundRequestMinimumSpaces;
    maximumSpaces = generationSettings.compoundRequestMaximumSpaces;
  }

  if (totalAliensRemaining === undefined || totalAliensRemaining <= 0) {
    return getRandomInteger(minimumSpaces, maximumSpaces);
  }

  var quotaPercent = getRandomInteger(minimumPercent, maximumPercent);
  var calculatedSpaces = Math.round(totalAliensRemaining * (quotaPercent / 100));

  return keepNumberInRange(calculatedSpaces, minimumSpaces, Math.min(maximumSpaces, totalAliensRemaining));
}

function reduceNameInitialRequestSpaces(spacesAvailable) {
  return Math.max(1, Math.ceil(spacesAvailable / 2));
}

function keepNumberInRange(value, minimum, maximum) {
  if (maximum < minimum) {
    return maximum;
  }

  if (value < minimum) {
    return minimum;
  }

  if (value > maximum) {
    return maximum;
  }

  return value;
}

function countTotalAliensRemaining() {
  var totalAliensRemaining = 0;
  var agentPeerIds = Object.keys(hostGameState.agents);

  for (var index = 0; index < agentPeerIds.length; index = index + 1) {
    var agentRecord = hostGameState.agents[agentPeerIds[index]];
    totalAliensRemaining = totalAliensRemaining + agentRecord.remainingAlienIds.length;
  }

  return totalAliensRemaining;
}

function getRandomEyeCountForRequest() {
  var availableEyeCounts = [];
  var agentPeerIds = Object.keys(hostGameState.agents);

  for (var agentIndex = 0; agentIndex < agentPeerIds.length; agentIndex = agentIndex + 1) {
    var agentRecord = hostGameState.agents[agentPeerIds[agentIndex]];

    for (var alienIndex = 0; alienIndex < agentRecord.aliens.length; alienIndex = alienIndex + 1) {
      var alien = agentRecord.aliens[alienIndex];
      var alienIsStillInPlay = agentRecord.remainingAlienIds.indexOf(alien.id) !== -1;

      if (alienIsStillInPlay === true && availableEyeCounts.indexOf(alien.numberOfEyes) === -1) {
        availableEyeCounts.push(alien.numberOfEyes);
      }
    }
  }

  if (availableEyeCounts.length === 0) {
    return getRandomInteger(generationSettings.minimumEyes, generationSettings.maximumEyes);
  }

  return getRandomItem(availableEyeCounts);
}

function getRandomAlienNameFirstLetterForRequest() {
  var availableLetters = [];
  var agentPeerIds = Object.keys(hostGameState.agents);

  for (var agentIndex = 0; agentIndex < agentPeerIds.length; agentIndex = agentIndex + 1) {
    var agentRecord = hostGameState.agents[agentPeerIds[agentIndex]];

    for (var alienIndex = 0; alienIndex < agentRecord.aliens.length; alienIndex = alienIndex + 1) {
      var alien = agentRecord.aliens[alienIndex];
      var alienIsStillInPlay = agentRecord.remainingAlienIds.indexOf(alien.id) !== -1;
      var firstLetter = alien.name.charAt(0).toUpperCase();

      if (alienIsStillInPlay === true && firstLetter.length > 0 && availableLetters.indexOf(firstLetter) === -1) {
        availableLetters.push(firstLetter);
      }
    }
  }

  if (availableLetters.length === 0) {
    return getRandomAlienNameFirstLetter();
  }

  return getRandomItem(availableLetters);
}

function countRemainingAliensWithNameInitial(initial) {
  var matchingAliens = 0;
  var agentPeerIds = Object.keys(hostGameState.agents);

  for (var agentIndex = 0; agentIndex < agentPeerIds.length; agentIndex = agentIndex + 1) {
    var agentRecord = hostGameState.agents[agentPeerIds[agentIndex]];

    for (var alienIndex = 0; alienIndex < agentRecord.aliens.length; alienIndex = alienIndex + 1) {
      var alien = agentRecord.aliens[alienIndex];
      var alienIsStillInPlay = agentRecord.remainingAlienIds.indexOf(alien.id) !== -1;

      if (alienIsStillInPlay === true && alien.name.charAt(0).toUpperCase() === initial) {
        matchingAliens = matchingAliens + 1;
      }
    }
  }

  return matchingAliens;
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

  if (condition.comparison === "lessThan") {
    return alienValue < condition.value;
  }

  if (condition.comparison === "startsWith") {
    return String(alienValue).charAt(0).toUpperCase() === condition.value;
  }

  return false;
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

function getAliensLeftText(remainingAliens) {
  if (remainingAliens === 1) {
    return "1 alien left";
  }

  return remainingAliens + " aliens left";
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

  if (requestCountdownTimer !== null) {
    return;
  }

  startEarthRequestCountdown();
}

function startEarthRequestCountdown() {
  clearRequestCountdownTimer();
  hostGameState.currentRequest = null;
  hostGameState.remainingSpaces = 0;
  hostGameState.currentRequestSubmissions = {};
  generateRequestButton.disabled = true;
  hostRequestText.textContent = "New Earth request incoming.";
  hideHostQuota();
  renderHostSubmissionList();
  showTemporaryHostStatus("New Earth request in 3 seconds.");
  runEarthRequestCountdown(3);
}

function runEarthRequestCountdown(count) {
  showRequestCountdown(count);
  broadcastEarthRequestCountdown(count);

  if (count > 1) {
    requestCountdownTimer = window.setTimeout(function() {
      runEarthRequestCountdown(count - 1);
    }, 1000);
    return;
  }

  requestCountdownTimer = window.setTimeout(function() {
    requestCountdownTimer = null;
    publishNewEarthRequest();
  }, 1000);
}

function publishNewEarthRequest() {
  hideRequestCountdown();
  hostGameState.currentRequest = generateEarthRequest(countTotalAliensRemaining());
  hostGameState.remainingSpaces = hostGameState.currentRequest.spaces;
  hostGameState.currentRequestSubmissions = {};
  generateRequestButton.disabled = hostGameState.gameOver === true;

  renderRequestText(hostRequestText, hostGameState.currentRequest);
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
  var batchContainedIncorrectAlien = false;
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
      batchContainedIncorrectAlien = true;
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

  if (batchContainedIncorrectAlien === true) {
    newAlienPenalty = addPenaltyAlienToAgent(agentRecord);
    addReasonIfMissing(rejectionReasons, "Penalty: one new alien joined your queue.");
  }

  recordHostSubmission(agentRecord, submittedAlienIds.length, acceptedAlienIds.length);
  sendSubmissionResult(agentRecord, acceptedAlienIds, rejectedAlienIds, rejectionReasons.join(" "), newAlienPenalty);
  updateHostAfterSubmission(agentRecord, acceptedAlienIds.length);
}

function addPenaltyAlienToAgent(agentRecord) {
  var newAlien = generateAlien();

  agentRecord.aliens.push(newAlien);
  agentRecord.remainingAlienIds.push(newAlien.id);

  return newAlien;
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
  clearRequestCountdownTimer();
  hideRequestCountdown();
  generateRequestButton.disabled = true;
  startGameButton.disabled = true;

  var winningMessage = "AGENT " + winnerName.toUpperCase() + " HAS CLEARED CUSTOMS!";
  var finalStandings = buildFinalStandings();
  gameOverMessage.textContent = winningMessage;
  renderGameOverStandings(finalStandings);
  setConnectionStatus("Game over");
  showOnlyScreen(gameOverScreen);

  broadcastToAgents({
    type: "game-over",
    message: winningMessage,
    standings: finalStandings,
    progress: buildPublicProgressList()
  });
}

function buildFinalStandings() {
  var standings = buildPublicProgressList().slice();

  standings.sort(function(firstPlayer, secondPlayer) {
    return firstPlayer.remainingAliens - secondPlayer.remainingAliens;
  });

  return standings;
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

  clearRequestCountdownTimer();
  hideRequestCountdown();
  clearGameOverStandings();
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

  clearRequestCountdownTimer();
  hideRequestCountdown();
  clearGameOverStandings();
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

function broadcastEarthRequestCountdown(count) {
  broadcastToAgents({
    type: "earth-request-countdown",
    count: count
  });
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

  if (message.type === "earth-request-countdown") {
    selectedAlienIds = [];
    agentRequestText.textContent = "New Earth request incoming.";
    agentQuotaText.textContent = "No active quota.";
    agentSubmissionStatus.textContent = "Get ready.";
    hideAgentRoundDetails();
    renderAlienTable();
    updateSelectedCount();
    sendSelectedButton.disabled = true;
    showRequestCountdown(message.count);
  }

  if (message.type === "earth-request") {
    hideRequestCountdown();
    selectedAlienIds = [];
    renderRequestText(agentRequestText, message.request);
    flashRequirementText(agentRequestText);
    agentQuotaText.textContent = getQuotaText(message.remainingSpaces);
    agentSubmissionStatus.textContent = "Select matching aliens and send them to customs.";
    showAgentRoundDetails();
    renderAlienTable();
    renderAgentProgress(message.progress);
    updateSelectedCount();
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
    hideRequestCountdown();
    gameOverMessage.textContent = message.message;
    renderGameOverStandings(message.standings || message.progress);
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

function renderGameOverStandings(standings) {
  gameOverStandings.innerHTML = "";

  if (Array.isArray(standings) === false || standings.length === 0) {
    return;
  }

  for (var index = 0; index < standings.length; index = index + 1) {
    var player = standings[index];
    var standingsRow = document.createElement("div");
    var nameElement = document.createElement("strong");
    var detailElement = document.createElement("span");

    standingsRow.className = "standings-row";
    nameElement.textContent = player.name;
    detailElement.textContent = getAliensLeftText(player.remainingAliens);

    standingsRow.appendChild(nameElement);
    standingsRow.appendChild(detailElement);
    gameOverStandings.appendChild(standingsRow);
  }
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

document.addEventListener("keydown", function(event) {
  if (event.key === "Escape" && howToPlayModal.hidden === false) {
    closeHowToPlayModal();
  }
});

howToPlayModal.addEventListener("click", function(event) {
  if (event.target === howToPlayModal) {
    closeHowToPlayModal();
  }
});

howToPlayButton.addEventListener("click", function() {
  openHowToPlayModal();
});

closeHowToPlayButton.addEventListener("click", function() {
  closeHowToPlayModal();
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

loadAlienDataFromJson();
