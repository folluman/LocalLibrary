const Book = require('../models/book');
const Genre = require('../models/genre');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');

// Display list of all Genre.
exports.genre_list = asyncHandler(async (req, res, next) => {
  const allGenre = await Genre.find().sort({name: 1}).exec();

  res.render('genre_list', {
    title: 'Genre List',
    genre_list: allGenre,
  });
});

// Display detail page for a specific Genre.
exports.genre_detail = asyncHandler(async (req, res, next) => {
  // Get details of genre and all associated books (in parallel)

  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({genre: req.params.id}, 'title summary').exec(),
  ]); // Utiliza Promise.all quando a execução pode ser feita em paralelo, sem depender uma da outra

  if(genre === null) {
    const err = new Error('Genre not found');
    err.status = 404;
    return next(err);
  }

  res.render('genre_detail', {
    title: 'Genre Detail',
    genre: genre,
    genre_books: booksInGenre,
  });
});

// Display Genre create form on GET.
exports.genre_create_get = (req, res, next) => { // não é necessário asynHandler(), porque não contém nenhum código que possa lançar uma exceção
  res.render('genre_form', { title: 'Create Genre' });
};

// Handle Genre create on POST.
exports.genre_create_post = [
  // Validate and sanitize the name field
  body('name', 'Genre name must contain at least 3 characters')
    .trim()
    .isLength({ min: 3 })
    .escape(),

  // Process request after validation and sanitization
  asyncHandler(async(req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data
    const genre = new Genre ({ name: req.body.name });

    if(!errors.isEmpty()){
      res.render('genre_form', {
        title: 'Create Genre',
        genre: genre,
        errors: errors.array(),
      });
      return;
    } else{
      // Data from form is valid
      // Check if Genre with same name already exists
      const genreExists = await Genre.findOne({ name: req.body.name })
        .collation({ locale: 'en', strength: 2 })
        .exec();

      if(genreExists) {
        // Genre exists, redirect to its detail page
        res.redirect(genreExists.url);
      } else {
        await genre.save();
        // New genre save. Redirect to genre detail page
        res.redirect(genre.url);
      }
    }
  })
];

// Display Genre delete form on GET.
exports.genre_delete_get = asyncHandler(async (req, res, next) => {
  const [genre, allBookByGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, 'title').exec(),
  ]);

  if(genre === null){
    res.redirect('/catalog/genres');
  }

  res.render('genre_delete', {
    title: 'Genre Delete',
    genre: genre,
    genre_books: allBookByGenre,
  });
});

// Handle Genre delete on POST.
exports.genre_delete_post = asyncHandler(async (req, res, next) => {
  const [genre, allBookByGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, 'title').exec(),
  ]);

  if(allBookByGenre.length > 0){
    res.render('genre_delete', {
      title: 'Genre Delete',
      genre: genre,
      genre_books: allBookByGenre,
    });
    return;
  } else {
    await Genre.findByIdAndDelete(req.body.genreid);
    res.redirect('/catalog/genres');
  }
});

// Display Genre update form on GET.
exports.genre_update_get = asyncHandler(async (req, res, next) => {
  const genre = await Genre.findById(req.params.id).exec();

  if(genre === null){
    const err = new Error('Genre not found');
    err.status = 404;
    return next(err);
  }

  res.render('genre_form', {
    title: 'Update Genre',
    genre: genre,
  });
});

// Handle Genre update on POST.
exports.genre_update_post = [
  body('name', 'Genre name must contain at least 3 characters')
    .trim()
    .isLength({ min: 3 })
    .escape(),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    const genre = new Genre ({
      name: req.body.name,
      _id: req.params.id, // This is required, Or a new ID will be assigned!
    });

    if(!errors.isEmpty()) {
      res.render('genre_form', {
        title: 'Update Genre',
        genre: genre,
      });
      return;
    } else {
      const updateGenre = await Genre.findByIdAndUpdate(req.params.id, genre, {});
      res.redirect(updateGenre);
    }
  })
];
