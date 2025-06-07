import { useState, useRef, useEffect, useReducer } from "react";
import { db, auth } from "./firebaseInit";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

function reducer(state, action) {
  switch (action.type) {
    case "SET_BLOGS":
      return [...action.payload];
    case "Add":
      return [action.blog, ...state];
    case "Remove":
      return state.filter((blog) => blog.id !== action.id);

    default:
      return [];
  }
}

//Blogging App using Hooks
export default function Blog() {
  const [user, setUser] = useState(null); // current logged-in user
  const [email, setEmail] = useState(""); // for sign-in form
  const [password, setPassword] = useState(""); // for sign-in form
  const [error, setError] = useState(""); // to show auth errors

  // const [title, setTitle] = useState("");
  // const [content, setContent] = useState("");
  const [formdata, setFormdata] = useState({ title: "", content: "" });
  //const [blog, setBlog] = useState([]);
  const [blog, dispatch] = useReducer(reducer, []);

  const titleRef = useRef();

  //Passing the synthetic event as argument to stop refreshing the page on submit
  async function handleSubmit(e) {
    e.preventDefault();
    //setBlog([{ title: formdata.title, content: formdata.content }, ...blog]);

    // dispatch({
    //   type: "Add",
    //   blog: { title: formdata.title, content: formdata.content },
    // });

    //Using setDoc

    // const docRef = doc(collection(db, "blogs")); //docRef = reference to a new document
    // await setDoc(docRef, {
    //   Title: formdata.title,
    //   Content: formdata.content,
    //   createdOn: new Date(),
    // });

    // Add a new document with an auto generated id.

    await addDoc(collection(db, "blogs"), {
      Title: formdata.title,
      Content: formdata.content,
      createdOn: new Date(),
      createdBy: user.uid, // save the user UID here
    });

    setFormdata({ title: "", content: "" });
    titleRef.current.focus();
  }
  async function handleDelete(id) {
    try {
      // Delete the doc in Firestore
      await deleteDoc(doc(db, "blogs", id));

      // Remove it locally from state
      dispatch({
        type: "Remove",
        id: id,
      });
    } catch (error) {
      console.error("Error deleting blog:", error);
    }
  }
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, [user]); // run this when user logs in

  useEffect(() => {
    // titleRef.current.focus(); // focus when component mounts
    // async function fetchData() {
    //   const querySnapshot = await getDocs(collection(db, "blogs"));
    //   querySnapshot.forEach((doc) => {
    //     // doc.data() is never undefined for query doc snapshots
    //     dispatch({
    //       type: "Add",
    //       blog: { title: doc.data().Title, content: doc.data().Content },
    //     });

    //     console.log(doc.data().Title);
    //   });
    // }
    // fetchData();

    const unsub = onSnapshot(collection(db, "blogs"), (snapshot) => {
      const blogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().Title,
        content: doc.data().Content,
        createdBy: doc.data().createdBy,
      }));
      console.log(blogs);
      dispatch({
        type: "SET_BLOGS",
        payload: blogs,
      });
    });
  }, []);
  useEffect(() => {
    if (blog.length) {
      console.log(blog.length && blog[0].title);
      document.title = blog[0].title;
    } else {
      document.title = "No blogs added";
    }
  }, [blog]);

  //for authentication

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      {/* Sign In Form when NOT logged in */}
      {!user && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await signInWithEmailAndPassword(auth, email, password);
              setError("");
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          <h2>Sign In</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Sign In</button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
      )}
      {/* If user is logged in, show sign out and blog UI */}
      {user && (
        <>
          <button
            onClick={() => {
              signOut(auth);
              setEmail(""); // Clear email field
              setPassword("");
            }}
          >
            Sign Out
          </button>
          {/* Heading of the page */}
          <h1>Write a Blog!</h1>

          {/* Division created to provide styling of section to the form */}
          <div className="section">
            {/* Form for to write the blog */}
            <form onSubmit={handleSubmit}>
              {/* Row component to create a row for first input field */}
              <Row label="Title">
                <input
                  className="input"
                  placeholder="Enter the Title of the Blog here.."
                  value={formdata.title}
                  onChange={(e) => {
                    setFormdata({ ...formdata, title: e.target.value });
                  }}
                  ref={titleRef}
                />
              </Row>

              {/* Row component to create a row for Text area field */}
              <Row label="Content">
                <textarea
                  className="input content"
                  placeholder="Content of the Blog goes here.."
                  value={formdata.content}
                  onChange={(e) => {
                    setFormdata({ ...formdata, content: e.target.value });
                  }}
                  required
                />
              </Row>

              {/* Button to submit the blog */}
              <button className="btn">ADD</button>
            </form>
          </div>

          <hr />

          {/* Section where submitted blogs will be displayed */}
          <h2> Blogs </h2>
          {blog.map((entry, index) => {
            return (
              <div key={index} className="blog">
                <h3>{entry.title}</h3>
                <p>{entry.content}</p>
                <div className="blog-btn">
                  <button
                    className="btn remove"
                    onClick={() => handleDelete(entry.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

//Row component to introduce a new row section in the form
function Row(props) {
  const { label } = props;
  return (
    <>
      <label>
        {label}
        <br />
      </label>
      {props.children}
      <hr />
    </>
  );
}
