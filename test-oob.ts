import fs from 'fs';
import axios from 'axios';

async function test() {
  const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  try {
    const res = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${config.apiKey}`, {
      requestType: "PASSWORD_RESET",
      email: "lila23maria07@gmail.com",
      returnOobLink: true
    });
    console.log("Success:", res.data);
  } catch (e: any) {
    console.log("Error:", JSON.stringify(e.response?.data, null, 2));
  }
}
test();
