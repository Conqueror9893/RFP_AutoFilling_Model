import streamlit as st
import requests
import pandas as pd
from io import BytesIO
from streamlit_modal import Modal
import pyperclip
import os
from utils.config import EXAMPLES, LABEL_OPTIONS

st.set_page_config(
    page_title="RFP Cruncher",  # Optional: Add a title for your app
    page_icon="📄",           # Optional: Add an icon for your app
    layout="wide"             # Set the layout to wide mode
)
# Load the external CSS file
def load_custom_css(file_name):
    with open(file_name, "r") as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

# Load custom styles
load_custom_css(".\src\css\custom_styles.css")


st.markdown('<div class="fixed-title"><h1>RFP Cruncher</h1></div>', unsafe_allow_html=True)
BASE_URL = os.getenv("API_BASE_URL")
 
# Function to copy the generated response to clipboard
def copy_to_clipboard(response):
    pyperclip.copy(response)
    st.success("Response copied to clipboard!")
 
# Create the Modal for file upload
upload_modal = Modal("Upload Excel File", key="upload_modal")
 
# Login Page
if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False
 
if not st.session_state['logged_in']:
    st.title("Login Page")
    st.subheader("Please enter your credentials")
 
    # Input fields for User ID and Password
    user_id = st.text_input("User ID", help="Enter your user ID")
    password = st.text_input("Password", type="password", help="Enter your password")
 
    # Login Button
    if st.button("Login", help="Click to log in to the application"):
        if user_id and password:
            st.session_state['logged_in'] = True
            st.session_state['user_id'] = user_id  # Store the user ID in session state
            st.success("Login successful! Redirecting to the main application...")
            st.rerun()  # This will trigger the page to rerun and navigate to the main page
        else:
            st.error("Please enter both User ID and Password")
 
# Main Application Page
if st.session_state['logged_in']:
    # Main Application Content
 
    # List of actions
    st.subheader("Choose an action:")
 
    col1, col2 = st.columns(2)
    with col1:
        if st.button("Ask a Query", help="Ask a question to categorize and generate a response based on the input query."):
            st.session_state["page"] = "generate"
            if "file_upload" in st.session_state:
                del st.session_state["file_upload"]  # Clear the file upload state
 
    with col2:
        if st.button("Enrich Responses", help="Refine and enrich responses based on your provided query and initial response."):
            st.session_state["page"] = "enrich"
            if "file_upload" in st.session_state:
                del st.session_state["file_upload"]  # Clear the file upload state
 
    if "page" not in st.session_state:
        st.stop()
 
    # Generate Responses Page
    if st.session_state["page"] == "generate":
        st.title("Generate Responses")
 
        # Display the button next to the subheader
        col1, col2 = st.columns([3, 1])
        with col1:
            st.subheader("Ask a Question and Get an Answer!")
        with col2:
            if st.button("Upload File", help="Upload an Excel file containing queries that you want to generate responses for."):
                upload_modal.open()
 
        if upload_modal.is_open():
            with upload_modal.container():
                st.subheader("Upload an Excel file with your queries, specify labels, and generate responses!")
                uploaded_file = st.file_uploader("Upload Excel file with queries", type=["xlsx"], help="Choose an Excel file with queries to process.")
 
                if uploaded_file:
                    # Read uploaded Excel
                    df = pd.read_excel(uploaded_file)
                    if "query" in df.columns:
                        st.session_state["file_upload"] = True  # Flag indicating file upload
                        st.success("File uploaded successfully! Detected queries column.")
                        st.session_state["uploaded_file"] = df  # Store the uploaded file in session
 
                        default_label = st.selectbox("Select a default label to attach to all questions:", options=LABEL_OPTIONS, help="Select a category label to apply to all queries.")
 
                        # Display the example for selected category
                        selected_example = EXAMPLES.get(default_label, None)
                        if selected_example:
                            formatted_example = selected_example.replace("\n", "<br>").replace("•", "-")  # Replaces bullet points to dashes if necessary
                            st.markdown(formatted_example, unsafe_allow_html=True)
 
                        # Button to generate responses for uploaded file with tooltip
                        with st.spinner("Generating responses, please wait..."):
                            if st.button("Generate Responses for File", help="Generate responses for each query in the uploaded file based on the selected label."):
                                try:
                                    api_url = "http://192.168.31.198:8000/generate"
                                    responses = []
                                    for query in df["query"]:
                                        payload = {"query": query, "label": default_label}
                                        response = requests.post(api_url, json=payload)
                                        if response.status_code == 200:
                                            generated_response = response.json().get("response", "No response generated.")
                                        else:
                                            generated_response = f"Error: {response.status_code}"
                                        responses.append(generated_response)
 
                                    df["label"] = default_label
                                    df["response"] = responses
                                    output = BytesIO()
                                    df.to_excel(output, index=False, engine="openpyxl")
                                    output.seek(0)
                                    st.success("Responses generated successfully!")
                                    st.download_button(
                                        label="Download Responses",
                                        data=output,
                                        file_name="responses_with_labels.xlsx",
                                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                        help="Download the generated responses along with labels attached to the queries."
                                    )
                                except Exception as e:
                                    st.error("Error while processing the queries.")
                                    st.write(str(e))
                    else:
                        st.error("Uploaded file must contain a column named 'query'.")
        # Ask a question and get category
        if "file_upload" not in st.session_state or not st.session_state["file_upload"]:
            question = st.text_area("", key="question", placeholder="Type your question here...", help="Type the question you want to categorize.")
 
        if st.button("Get Category", help="Send the question to the API to receive a predicted category for your query."):
            if question:
                try:
                    # API endpoint for test
                    test_api_url = "http://192.168.31.198:8000/get_category"
                    
                    with st.spinner("Getting category, please wait..."):
                        # Payload must match Pydantic model
                        response = requests.post(test_api_url, json={"query": question})
 
                        if response.status_code == 200:
                            predicted_class = response.json().get("predicted_class", "Unknown")
                            st.session_state["predicted_label"] = str(predicted_class)
                            st.success(f"Predicted Category: {predicted_class}")
                            st.session_state["category_received"] = True  # Set a flag for category received
                        else:
                            st.error(f"Error: {response.status_code}")
                            st.write(response.text)
                except Exception as e:
                    st.error("Error connecting to the API.")
                    st.write(str(e))
            else:
                st.warning("Please enter a question!")
 
# Ensure 'category' is defined before using it in a condition
if "category_received" in st.session_state and st.session_state["category_received"]:
    if "predicted_label" in st.session_state:
        # Dropdown for label selection with description inside each option
        # If LABEL_OPTIONS is a list of strings
        formatted_options = [
            f"{option}\n{option}" for option in LABEL_OPTIONS
        ]
 
        selected_index = list(LABEL_OPTIONS.keys()).index(
            st.session_state["predicted_label"]
        ) if st.session_state["predicted_label"] in LABEL_OPTIONS else 0
        selected_label = st.selectbox(
            "Please confirm if this category suits or Choose another.",
            options=formatted_options,
            help="Select a label that fits your query from the predicted category or choose another one."
        )
 
        # Now, safely split selected_label into category and description
        category, description = selected_label.split("\n", 1)
 
        st.write(f"**Selected Category:** {category.strip()}")
 
        # Display the example for the selected category
        selected_example = EXAMPLES.get(category.strip(), None)
        if selected_example:
            formatted_example = selected_example.replace("\n", "<br>").replace("•", "-")  # Replaces bullet points to dashes if necessary
            st.markdown(formatted_example, unsafe_allow_html=True)
 
        # Enable the "Generate Response" button once category is confirmed
        if category.strip():
            if st.button("Generate Response", help="Generate a response based on the selected category and query."):
                if category.strip():
                    try:
                        # Send the query and selected category to the API for generating the response
                        generate_api_url = "http://192.168.31.198:8000/generate"
                        payload = {"query": question, "label": category.strip()}
                        response = requests.post(generate_api_url, json=payload)
 
                        if response.status_code == 200:
                            answer = response.json().get("response", "No response found.")
                            st.session_state["generated_response"] = answer
 
                            # Fetch similar questions once the response is generated
                            similar_api_url = "http://192.168.31.198:8000/similar_questions"
                            similar_response = requests.post(similar_api_url, json={"query": question})
 
                            # Modal container open
                            modal_open = True  # Track if the modal is open
                            modal_key = "generate_response_modal"
 
                            with st.container():
                                # Display the generated response on the left side and similar questions on the right side
                                left_column, right_column = st.columns([2, 3])  # Adjust the column sizes
 
                                with left_column:
                                    st.write(f"**Query:** {question}")
                                    st.write(f"**Category:** {category.strip()}")
                                    st.write(f"**Generated Response:** {answer}")
 
                                    # Check if an answer was previously saved and pre-fill the text area
                                    saved_answer = st.session_state.get("saved_answer", "")
 
                                    # Add a text area for the user to enter their own answer
                                    user_answer = st.text_area("Enter your answer:", value=saved_answer, key="user_answer", height=150, help="Provide your own response here.")
                                    
                                    SAVE_ANSWER_API_URL = "http://192.168.31.198:8000/save_answer"
                                    # Save button
                                    if st.button("Save Answer"):
                                        if question and user_answer: 
                                            try:
                                                # Prepare payload for the API call
                                                payload = {"query": question, "answer": user_answer}
                                                response = requests.post(SAVE_ANSWER_API_URL, json=payload)

                                                # Handle API response
                                                if response.status_code == 200:
                                                    response_data = response.json()
                                                    if response_data.get("status") == "success":
                                                        st.success(response_data.get("message", "Answer saved successfully!"))
                                                    else:
                                                        st.error(response_data.get("message", "Failed to save the answer."))
                                                else:
                                                    st.error(f"Error: {response.status_code}")
                                                    st.write(response.text)
                                            except Exception as e:
                                                st.error(f"Error connecting to the API: {str(e)}")
                                        else:
                                            st.warning("Please provide both the query and the answer!")
                                
                                with right_column:
                                    # Make the right column scrollable for similar questions
                                    if similar_response.status_code == 200:
                                        similar_questions = similar_response.json().get("similar_questions", [])
                                        if similar_questions:
                                            st.subheader("Similar Questions:")
 
                                            # Sort the questions by similarity score (highest first) and show only the top 3
                                            similar_questions.sort(key=lambda x: x['similarity_score'], reverse=True)
                                            top_similar_questions = similar_questions[:3]  # Limit to top 3 questions
 
                                            # Loop through the top 3 similar questions and display them
                                            for idx, similar_question in enumerate(top_similar_questions):
                                                question_text = similar_question['question']
                                                answer_text = similar_question['answer']
                                                similarity_score = similar_question['similarity_score']

                                                # Use Markdown for rendering without inline HTML/CSS
                                                st.markdown(
                                                    f"""
                                                    <div class="card">
                                                        <strong>{idx + 1}. {question_text}</strong>
                                                        <p><em>Answer:</em> {answer_text}</p>
                                                        <p><em>Similarity Score:</em> {similarity_score:.2f}</p>
                                                    </div>
                                                    """,
                                                    unsafe_allow_html=True,
                                                )

 
                                        else:
                                            st.write("No similar questions found.")
                                    else:
                                        st.error("Error fetching similar questions.")
                                        st.write(similar_response.text)
 
                            # Display success message (inside the modal context)
                            if "success_message" in st.session_state:
                                st.success(st.session_state["success_message"])
                                # Clear success message after showing
                                del st.session_state["success_message"]
 
                        else:
                            st.error(f"Error: {response.status_code}")
                            st.write(response.text)
                    except Exception as e:
                        st.error("Error connecting to the API.")
                        st.write(str(e))
                else:
                    st.warning("Please confirm or edit the label!")
if "page" not in st.session_state:
    st.session_state["page"] = "generate"
 
    # Ensure that 'page' is correctly set to 'enrich' when the "Enrich Responses" button is pressed
if st.session_state["page"] == "enrich":
    st.title("Enrich Responses")
    st.subheader("Refine and Enrich the Responses")
    
    # Step 1: Capture the necessary inputs for enrichment
    question = st.text_area("Enter the query you want to enrich:", help="Enter the query for which you'd like to refine the response.")
    
    label = st.selectbox("Select or edit the label:", options=LABEL_OPTIONS, help="Select a category label for the query.")
    
    initial_response = st.text_area("Enter the response you want to enrich:", help="Provide the response you want to enhance with more details.")
    
    # Step 2: Validation check for empty fields
    if st.button("Enrich Response", help="Enhance the response by submitting the query and initial response for enrichment."):
        if question and label and initial_response:
            try:
                enrich_api_url = "http://192.168.31.198:8000/enrich"  # Ensure this endpoint is correct
                payload = {
                    "query": question,
                    "label": label,
                    "response_to_enrich": initial_response
                }
 
                with st.spinner("Enriching the response, please wait..."):
                    response = requests.post(enrich_api_url, json=payload)
 
                    # Step 3: Handle the API response
                    if response.status_code == 200:
                        enriched_response = response.json().get("enriched_response", "No enriched response found.")
                        st.text_area("Enriched Response:", value=enriched_response, key="enriched_response", height=150)
                        st.success("Response enriched successfully!")
                    else:
                        st.error(f"Error: {response.status_code}")
                        st.write(response.text)
            except Exception as e:
                st.error(f"Error connecting to the API: {str(e)}")
        else:
            st.warning("Please provide a query, label, and initial response!")
 
