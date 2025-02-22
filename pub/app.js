// Show login button if not authenticated
document.getElementById('loginButton').addEventListener('click', () => {
    window.location.href = '/login';
  });
  
  // Check if the user is authenticated (access token exists)
  const checkAuth = () => {
    fetch('/check-auth')
      .then(response => response.json())
      .then(data => {
        if (data.authenticated) {
          // Hide login button and show playlist form
          document.getElementById('loginButton').style.display = 'none';
          document.getElementById('playlistForm').style.display = 'block';
        }
      })
      .catch(error => console.error('Error checking auth:', error));
  };
  
  // Add dynamic course input fields
  document.getElementById('addCourse').addEventListener('click', () => {
    const courseFields = document.getElementById('courseFields');
    const newCourseInput = document.createElement('div');
    newCourseInput.className = 'courseInput';
    newCourseInput.innerHTML = `
      <label for="course${courseFields.children.length + 1}">Course:</label>
      <input type="text" id="course${courseFields.children.length + 1}" placeholder="e.g., Operating Systems" required>
    `;
    courseFields.appendChild(newCourseInput);
  });
  
  // Handle form submission
  document.getElementById('playlistForm').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    // Get all course inputs
    const courseInputs = document.querySelectorAll('.courseInput input');
    const courses = Array.from(courseInputs).map(input => input.value);
  
    const mood = document.getElementById('mood').value;
  
    // Fetch playlist from backend
    try {
      const response = await fetch(`/generate-playlist?courses=${encodeURIComponent(courses.join(','))}&mood=${mood}`);
      if (!response.ok) {
        throw new Error('Failed to generate playlist.');
      }
      const playlistHTML = await response.text();
      document.getElementById('playlistContainer').innerHTML = playlistHTML;
    } catch (error) {
      console.error(error);
      document.getElementById('playlistContainer').innerHTML = 'Failed to generate playlist. Please try again.';
    }
  });
  
  // Check authentication status on page load
  checkAuth();