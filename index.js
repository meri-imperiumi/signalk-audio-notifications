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
      const duplicated = `${notification.value.message} Repeat: ${notification.value.message}`;
      say.speak(duplicated, null, null, (sayErr) => {
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
        if (!value.value) {
          return;
        }
        if (!value.value.state || ['alarm', 'emergency'].indexOf(value.value.state) === -1) {
          return;
        }
        if (!value.value.method || value.value.method.indexOf('sound') === -1) {
          return;
        }
        audibleNotifications.push(value);
      });
    });
    return Promise.all(audibleNotifications.map((notify) => playNotification(notify)));
  };

  let unsubscribes = [];
  plugin.start = () => {
    app.debug('audio notifications started');
    const subscription = {
      context: 'vessels.self',
      subscribe: [{
        path: 'notifications.*',
        policy: 'instant',
      }],
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

  return plugin;
};
