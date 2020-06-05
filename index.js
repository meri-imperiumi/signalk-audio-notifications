const player = require('play-sound')({});
const say = require('say');
const path = require('path');

module.exports = (app) => {
  const plugin = {};

  plugin.id = 'signalk-audio-notifications';
  plugin.name = 'signalk-audio-notifications';
  plugin.description = 'Provides SignalK audio notifications';

  const playNotification = (notification) => new Promise((resolve, reject) => {
    const notificationFile = path.resolve(__dirname, './assets/notification.mp3');
    player.play(notificationFile, (err) => {
      if (err) {
        reject(err);
        return;
      }
      let playable = notification.message;
      if (notification.type === 'alarm') {
        playable = `${notification.message} Repeat: ${notification.message}`;
      }
      say.speak(playable, null, null, (sayErr) => {
        if (sayErr) {
          reject(sayErr);
          return;
        }
        resolve();
      });
    });
  });

  const handleNotification = (notification) => {
    const audibleNotifications = [];
    notification.updates.forEach((update) => {
      update.values.forEach((value) => {
        if (value.path === 'navigation.state') {
          audibleNotifications.push({
            message: `Vessel is now ${value.value}`,
            type: 'message',
          });
          return;
        }
        if (!value.value) {
          return;
        }
        if (!value.value.state || ['alarm', 'emergency'].indexOf(value.value.state) === -1) {
          return;
        }
        if (!value.value.method || value.value.method.indexOf('sound') === -1) {
          return;
        }
        audibleNotifications.push({
          message: value.value.message,
          type: 'alarm',
        });
      });
    });
    return Promise.all(audibleNotifications.map((notify) => playNotification(notify)));
  };

  let unsubscribes = [];
  plugin.start = () => {
    app.debug('audio notifications started');
    const subscription = {
      context: 'vessels.self',
      subscribe: [
        {
          path: 'notifications.*',
          policy: 'instant',
        },
        {
          path: 'navigation.state',
          policy: 'instant',
        },
      ],
    };
    app.subscriptionmanager.subscribe(
      subscription,
      unsubscribes,
      (subscriptionError) => {
        app.error(`Error:${subscriptionError}`);
      },
      handleNotification,
    );
    say.speak('Audio notifications activated');
  };

  plugin.stop = () => {
    app.debug('audio notifications stopped');
    unsubscribes.forEach((f) => f());
    unsubscribes = [];
    say.speak('Audio notifications deactivated');
  };

  plugin.schema = {};

  return plugin;
};
