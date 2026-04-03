import dotenv from 'dotenv';
import app from './src/app.js';

dotenv.config();

const port = Number(process.env.PORT || 5001);

app.listen(port, () => {
  console.log(`EducoLink backend running on http://localhost:${port}`);
});
