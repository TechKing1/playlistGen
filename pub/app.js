// Show login button if not authenticated
document.getElementById('loginButton').addEventListener('click', () => {
    window.location.href = '/login';
  });
  
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
    const duration = document.getElementById('duration').value;
  
    // Fetch playlist from backend
    try {
      const response = await fetch(`/generate-playlist?courses=${encodeURIComponent(courses.join(','))}&mood=${mood}`);
      if (!response.ok) {
        throw new Error('Failed to generate playlist.');
      }
      const playlistHTML = await response.text();
      document.getElementById('playlistContainer').innerHTML = playlistHTML;
  
      // Start timer
      startTimer(duration * 60);
    } catch (error) {
      console.error(error);
      document.getElementById('playlistContainer').innerHTML = 'Failed to generate playlist. Please try again.';
    }
  });
  
  // Timer function
  const startTimer = (duration) => {
    let timer = duration;
    const timerContainer = document.getElementById('timerContainer');
    const interval = setInterval(() => {
      const minutes = Math.floor(timer / 60);
      const seconds = timer % 60;
      timerContainer.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      if (--timer < 0) {
        clearInterval(interval);
        timerContainer.textContent = "Time's up!";
      }
    }, 1000);
  };