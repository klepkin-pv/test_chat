import { render, screen, fireEvent } from '@testing-library/react'
import EmojiPicker from '../EmojiPicker'

describe('EmojiPicker', () => {
  const mockOnEmojiSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders emoji picker button', () => {
    render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />)
    
    const button = screen.getByTitle('Добавить эмодзи')
    expect(button).toBeInTheDocument()
  })

  it('opens emoji picker when button is clicked', () => {
    render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />)
    
    const button = screen.getByTitle('Добавить эмодзи')
    fireEvent.click(button)
    
    // Should show emoji categories (check for the picker container)
    expect(screen.getByText('Выберите эмодзи')).toBeInTheDocument()
    // Check for category buttons
    expect(screen.getAllByText('😊')).toHaveLength(2) // One in tab, one in grid
    expect(screen.getByText('👋')).toBeInTheDocument()
    expect(screen.getByText('❤️')).toBeInTheDocument()
    expect(screen.getByText('🎉')).toBeInTheDocument()
  })

  it('calls onEmojiSelect when emoji is clicked', () => {
    render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />)
    
    // Open picker
    const button = screen.getByTitle('Добавить эмодзи')
    fireEvent.click(button)
    
    // Click on an emoji
    const emoji = screen.getByText('😀')
    fireEvent.click(emoji)
    
    expect(mockOnEmojiSelect).toHaveBeenCalledWith('😀')
  })

  it('closes picker when clicking outside', () => {
    render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />)
    
    // Open picker
    const button = screen.getByTitle('Добавить эмодзи')
    fireEvent.click(button)
    
    expect(screen.getByText('Выберите эмодзи')).toBeInTheDocument()
    
    // Click outside (on the overlay)
    const overlay = screen.getByTestId('emoji-picker-overlay')
    fireEvent.click(overlay)
    
    expect(screen.queryByText('Выберите эмодзи')).not.toBeInTheDocument()
  })

  it('switches between emoji categories', () => {
    render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />)
    
    // Open picker
    const button = screen.getByTitle('Добавить эмодзи')
    fireEvent.click(button)
    
    // Click on "❤️" category (hearts)
    const heartsTab = screen.getByText('❤️')
    fireEvent.click(heartsTab)
    
    // Should show heart emojis
    expect(screen.getByText('💛')).toBeInTheDocument()
    expect(screen.getByText('💚')).toBeInTheDocument()
  })

})