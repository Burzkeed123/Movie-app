// get user from local storage
function getUser() {
  return JSON.parse(localStorage.getItem("user")) || [];
}

// set user to local storage
function setUser(user) {
  return localStorage.setItem("user", JSON.stringify(user));
}

// Hash password using SHA-256
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Generate a unique account number
function generateAccountNumber() {
  const users = getUser();
  let accountNumber;
  do {
    accountNumber = "3" + Math.floor(1000000000 + Math.random() * 9000000000);
  } while (users.some((u) => u.accountNumber === accountNumber));
  return accountNumber;
}

document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // Signup
  // -----------------------------
  const fullName = document.querySelector("#full_name");
  const email = document.querySelector("#email");
  const password = document.querySelector("#password");
  const signUpBtn = document.querySelector("#signup_button");
  const user = getUser();

  if (signUpBtn) {
    async function signUpBtnClickHandler(ev) {
      ev.preventDefault();

      if (!fullName.value || !email.value || !password.value) {
        alert("Please fill in all fields.");
        return;
      }

      if (!email.value.includes("@")) {
        alert("Please enter a valid email address.");
        return;
      }

      if (user && user.some((u) => u.email === email.value)) {
        alert("User already exists.");
        return;
      }

      if (password.value.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
      }

      const hashedPassword = await hashPassword(password.value);
      const newUser = {
        id: crypto.randomUUID(),
        accountNumber: generateAccountNumber(),
        fullName: fullName.value,
        email: email.value,
        password: hashedPassword,
        save: [], // favorites
        transaction: [],
        history: [], // ✅ search history
        balance: 0,
        createdAt: new Date().toISOString(),
      };

      user.push(newUser);
      setUser(user);
      alert("User registered successfully!");
      window.location.href = "login.html";
    }

    signUpBtn.addEventListener("click", signUpBtnClickHandler);
  }

  // -----------------------------
  // Login
  // -----------------------------
  const loginEmail = document.querySelector("#login_email");
  const loginPassword = document.querySelector("#login_password");
  const loginBtn = document.querySelector("#login_button");

  if (loginBtn) {
    loginBtn.addEventListener("click", async (ev) => {
      const user = getUser();
      ev.preventDefault();

      if (!loginEmail.value || !loginPassword.value) {
        alert("please fill in all fields");
        return;
      }

      const hashedPassword = await hashPassword(loginPassword.value);
      const matchedUser = user.find(
        (u) => u.email === loginEmail.value && u.password === hashedPassword
      );

      if (matchedUser) {
        sessionStorage.setItem("loginUser", JSON.stringify(matchedUser));
        alert("Login successful!");
        window.location.href = "board.html";
      } else {
        alert("Error user not found");
      }
    });

    loginEmail.value = "";
    loginPassword.value = "";
  }

  // -----------------------------
  // Movies Search (OMDb API)
  // -----------------------------
  const API_KEY = "458643da";
  const resultsDiv = document.getElementById("results");
  const historyDiv = document.getElementById("history"); // ✅ display search history

  // FAVORITE TOGGLE FUNCTION
  function toggleFavorite(movie, button) {
    const loggedInUser = JSON.parse(sessionStorage.getItem("loginUser"));
    if (!loggedInUser) {
      alert("Please log in to manage favorites!");
      return;
    }

    let users = getUser();
    let userIndex = users.findIndex((u) => u.email === loggedInUser.email);
    if (userIndex === -1) {
      alert("User not found. Please log in again.");
      return;
    }

    let favorites = users[userIndex].save || [];

    // check if already favorited
    const movieIndex = favorites.findIndex((m) => m.imdbID === movie.imdbID);

    if (movieIndex !== -1) {
      favorites.splice(movieIndex, 1);
      button.textContent = "❤️ Favorite";
      button.className =
        "mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition";
      alert(`${movie.Title} removed from favorites!`);
    } else {
      favorites.push(movie);
      button.textContent = "❌ Remove";
      button.className =
        "mt-2 px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 transition";
      alert(`${movie.Title} added to favorites!`);
    }

    users[userIndex].save = favorites;
    setUser(users);
    sessionStorage.setItem("loginUser", JSON.stringify(users[userIndex]));
  }

  // ✅ SAVE SEARCH HISTORY
  function saveSearch(query) {
    const loggedInUser = JSON.parse(sessionStorage.getItem("loginUser"));
    if (!loggedInUser) return;

    let users = getUser();
    let userIndex = users.findIndex((u) => u.email === loggedInUser.email);
    if (userIndex === -1) return;

    let history = users[userIndex].history || [];

    // avoid duplicates
    if (!history.includes(query)) {
      history.unshift(query);
      if (history.length > 10) history.pop(); // keep last 10 searches
    }

    users[userIndex].history = history;
    setUser(users);
    sessionStorage.setItem("loginUser", JSON.stringify(users[userIndex]));
    renderHistory(history);
  }

  // ✅ RENDER SEARCH HISTORY
  function renderHistory(history) {
    if (!historyDiv) return;
    historyDiv.innerHTML = "";
    if (history.length === 0) {
      historyDiv.innerHTML =
        "<p class='text-gray-500 italic'>No search history yet</p>";
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list-disc pl-6 space-y-2";

    history.forEach((query) => {
      const li = document.createElement("li");
      li.textContent = query;
      li.className =
        "cursor-pointer text-blue-600 hover:underline hover:text-blue-800";
      li.addEventListener("click", () => fetchMovies(query)); // click to search again
      ul.appendChild(li);
    });

    historyDiv.appendChild(ul);
  }

  function fetchMovies(query) {
    fetch(
      `https://www.omdbapi.com/?s=${encodeURIComponent(
        query
      )}&apikey=${API_KEY}`
    )
      .then((res) => res.json())
      .then((data) => {
        resultsDiv.innerHTML = "";

        if (data.Response === "True") {
          data.Search.forEach((movie) => {
            const card = document.createElement("div");
            card.className =
              "bg-white rounded-lg shadow-lg overflow-hidden transform transition hover:scale-105";

            const poster = document.createElement("img");
            poster.src =
              movie.Poster !== "N/A"
                ? movie.Poster
                : "https://via.placeholder.com/300x450?text=No+Image";
            poster.alt = movie.Title;
            poster.className = "w-full h-[22rem] object-cover";

            const info = document.createElement("div");
            info.className = "p-4";

            const title = document.createElement("h3");
            title.className = "text-lg font-bold text-gray-800";
            title.textContent = movie.Title;

            const year = document.createElement("p");
            year.className = "text-gray-600";
            year.textContent = `Year: ${movie.Year}`;

            // FAVORITE BUTTON
            const favBtn = document.createElement("button");
            favBtn.className =
              "mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition";
            favBtn.textContent = "❤️ Favorite";

            // check if already favorited
            const loggedInUser = JSON.parse(
              sessionStorage.getItem("loginUser")
            );
            if (loggedInUser) {
              const users = getUser();
              const current = users.find((u) => u.email === loggedInUser.email);
              if (
                current &&
                current.save.some((m) => m.imdbID === movie.imdbID)
              ) {
                favBtn.textContent = "❌ Remove";
                favBtn.className =
                  "mt-2 px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 transition";
              }
            }

            favBtn.addEventListener("click", () =>
              toggleFavorite(movie, favBtn)
            );

            info.appendChild(title);
            info.appendChild(year);
            info.appendChild(favBtn);

            card.appendChild(poster);
            card.appendChild(info);
            resultsDiv.appendChild(card);
          });

          // ✅ Save history after successful search
          saveSearch(query);
        } else {
          resultsDiv.innerHTML = ` 
            <div class="flex justify-center items-center p-6">
              <p class="text-red-600 font-bold text-xl bg-red-100 border border-red-400 rounded-lg px-10 py-7 shadow-md">
                ⚠️ ${data.Error}
              </p>
            </div>`;
        }
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        alert("Something went wrong. Please try again.");
      });
  }

  // Search button
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      const query = document.getElementById("search").value.trim();
      if (!query) {
        alert("Please enter a movie search term");
        return;
      }
      fetchMovies(query);
    });
  }

  // Search by pressing Enter
  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        searchBtn.click();
      }
    });
  }

  // Load default movies
  if (resultsDiv) {
    fetchMovies("movie");
  }

  // Load history on page load
  const loggedInUser = JSON.parse(sessionStorage.getItem("loginUser"));
  if (loggedInUser) {
    const users = getUser();
    const current = users.find((u) => u.email === loggedInUser.email);
    if (current && current.history) {
      renderHistory(current.history);
    }
  }
});
