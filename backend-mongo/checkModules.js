import mongoose from 'mongoose';
import Client from './src/models/Client.js';
(async()=>{
  try{
    await mongoose.connect(process.env.MONGODB_URI||'mongodb://localhost:27017/school_erp');
    const client=await Client.findOne({code:'demo-school'},{enabledModules:1,_id:0}).lean();
    console.log('enabledModules:',JSON.stringify(client?.enabledModules));
    await mongoose.disconnect();
  }catch(e){console.error('err',e);}
})();
