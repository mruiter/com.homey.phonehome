'use strict';

module.exports = async (session) = {
   Simpel er is maar één virtueel device
  await session.showView('list_devices');

  session.setHandler('list_devices', async () = {
    return [
      {
        name 'VOIP Player',
        data { id 'voip_player' }
      }
    ];
  });
};
