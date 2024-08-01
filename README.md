Welcome to DumbSyed.

# RFP_AutoFilling_Model
The model is trained using Google's vector model and NLP techniques like cosine similarity, word2vec and TF-IDF. It autofills RFPs so that the manual work is removed.

Current version and iteration: V01 I02

New release: Added the similarity rating functionality to understand how similar the question is to the loaded data. This gives an understanding on how accurate the answer might be.

Pre-requisites:

-> Python 
-> Node
-> Rfp training files(Included in the package)
-> [Google's pretrained vector model](https://drive.google.com/file/d/0B7XkCwpI5KDYNlNUTTlSS21pQmM/edit?usp=sharing)

Install the following to start the model:

In backend folder:
-> pip install flask
-> pip install flask-cors
-> pip install numpy
-> pip install pandas
-> pip install scikit-learn
-> pip install gensim
-> pip install openpyxl

In QA_app folder:
-> npm i

To run the model:

-> In backend folder:
python app.py
-> In QA_app folder:
npm run dev

How to train the model:

1) Click the train button
2) Select the rfp training files (some files are included in the RFP_Training folder)
3) On successful training, the page will navigate to the upload and answer page
4) Ask any question to get the answer with similarity rating, or
5) Upload excel file with questions to get the answers

Criteria for training and uploading:

-> The current version only supports excel files
-> The excel file must:
a) Have the "Questions" and "Answer" as the column name. Any other name is not supported. (Keep in mind not to put space after the name)
b) No blank rows in the excel file (e.g., the question field is empty but not the answer field or vice versa).
c) No blank rows in between the filled rows

-> For uploading excel file to get filled answers:
a) Have the header name as "Questions". 
b) Would be advised to remove other columns while uploading.
c) Have a blank column with "Answer" header to get the answers.

DumbSyed is still in development mode and would not be recommended for enterprise use yet. Future releases would improve upon its capabilities.
Any improvements in the model are welcome.
