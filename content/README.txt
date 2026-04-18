Transfer Trivia external content folders

Structure:
- content/manifest.json lists categories and clue folders
- each clue folder contains:
  - question.txt   the prompt shown first
  - answer.txt     the correct response; separate multi-part answers with a blank line
  - meta.json      category, points, badges, and image file names
  - question-images/   question-only reference images (image1.png, image2.jpg, etc.)
  - answer-images/     answer-only reference images (image1.png, image2.jpg, etc.)

Notes:
- For best results, serve the project from a local web server in VS Code instead of opening the HTML file directly with file://
- The HTML file keeps the original embedded deck as a fallback if external loading is blocked
- If you duplicate this project for a new lesson, update the content folder and keep the engine HTML intact
- Media loading now prioritizes `question-images/` and `answer-images/` inside each cell folder.
- Legacy root-level image files are still probed as a fallback for backward compatibility.


Question loading note:
- The HTML now loads question text from each cell folder using question.js.
- Keep question.txt as your editable source text.
- After editing question.txt, mirror that text into question.js or regenerate it in the next build.
- This question.js method is used because local browsers often block fetch() from file:// paths, while relative script files load more reliably.
