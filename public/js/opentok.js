const session = OT.initSession(apiKey, sessionId);
const publisher = OT.initPublisher("publisher", {
  insertMode: "append",
  width: "100%",
});

session.on({
  streamCreated: (event) => {
    const subscriberClassName = `subscriber-${event.stream.streamId}`;
    const subscriber = document.createElement("div");
    subscriber.setAttribute("id", subscriberClassName);
    document.getElementById("subscribers").appendChild(subscriber);
    session.subscribe(event.stream, subscriberClassName);
  },
  streamDestroyed: (event) => {
    console.log(`Stream ${event.stream.name} ended because ${event.reason}.`);
  },
  sessionConnected: (event) => {
    console.log("session connected", event);
    session.publish(publisher);
  },
  signal: (event) => {
    console.log("Signal event sent from connection: ", JSON.stringify(event));
    console.log("Signal data: ", JSON.stringify(event.data));

    switch (event.type) {
      case "signal:sipVideoOut":
        setSipVideoOutHtml(event.data.sipCall);
        break;
      case "signal:callType":
        document.getElementById("callType").innerHTML = event.data.callType;
        break;
      case "SipVideoOutDuration":
        document.getElementById("SipVideoOutDuration").innerHTML =
          event.data.SipVideoOutDuration;
        break;
      case "SipVideoInDuration":
        document.getElementById(
          "SipVideoInDuration"
        ).innerHTML = `<p>Duration: ${event.data.SipVideoInDuration}s</p><p>Price: ${event.data.price}</p>`;
        break;
      case "pstnInDuration":
        document.getElementById("pstnInDuration").innerHTML =
          event.data.pstnInDuration;
        break;
      case "pstnOutDuration":
        document.getElementById("pstnOutDuration").innerHTML =
          event.data.pstnOutDuration;
        break;
      default:
        console.log("irrelevant signal");
        break;
    }
  },
});

session.connect(token, (error) => {
  if (error) {
    console.log("error connecting to session");
  }
});

function setSipVideoOutHtml(data) {
  let html = "";
  ["id", "projectId", "sessionId", "sessionId", "streamId"].forEach((key) => {
    html += `<p>${key}: ${data[key]}<p>`;
  });
  document.getElementById("sipVideoOut").innerHTML = html;
}
